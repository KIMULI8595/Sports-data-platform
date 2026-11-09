
export const statuses = new Map(Object.entries({
  NS: 'scheduled',
  TBD: 'scheduled',
  PST: 'postponed',
  CANC: 'cancelled',
  SUSP: 'suspended',
  INT: 'suspended',
  FT: 'finished',
  AET: 'finished',
  PEN: 'finished',
  HT: 'half_time',
  '1H': 'live',
  '2H': 'live',
  ET: 'live',
  P: 'live',
  BT: 'live',
  LIVE: 'live',
  ABD: 'abandoned',
}));

const liveStatuses = new Set([
  'live',
  'half_time',
]);

const terminalStatuses = new Set([
  'finished',
  'cancelled',
  'abandoned',
]);

export function assessFixture(match, item) {
  const status = statuses.get(
    item?.fixture?.status?.short
  );

  if (!match || !status) {
    return {
      kind: 'skipped',
      reason: 'unmapped_or_unknown_status',
    };
  }

  // Historical synchronization must never interfere
  // with active live-score processing.
  if (
    liveStatuses.has(match.status) ||
    liveStatuses.has(status)
  ) {
    return {
      kind: 'conflict',
      reason: 'live_fixture',
    };
  }

  // Do not reverse an already finalized match
  // to another lifecycle state.
  if (
    terminalStatuses.has(match.status) &&
    match.status !== status
  ) {
    return {
      kind: 'conflict',
      reason: 'terminal_status_change',
    };
  }

  const data = { status };

  if (status === 'finished') {
    const home = item?.goals?.home;
    const away = item?.goals?.away;

    // Never write incomplete or invalid scores.
    if (
      !Number.isInteger(home) ||
      home < 0 ||
      !Number.isInteger(away) ||
      away < 0
    ) {
      return {
        kind: 'skipped',
        reason: 'invalid_final_score',
      };
    }

    // Protect finalized scores from automatic changes.
    // Discrepancies require deliberate manual review.
    if (
      match.status === 'finished' &&
      (
        match.homeScore !== home ||
        match.awayScore !== away
      )
    ) {
      return {
        kind: 'conflict',
        reason: 'finalized_score_difference',
      };
    }

    data.homeScore = home;
    data.awayScore = away;
  }

  const changed = Object.entries(data).some(
    ([key, value]) => match[key] !== value
  );

  if (!changed) {
    return { kind: 'unchanged' };
  }

  return {
    kind: 'eligible',
    data,
    original: {
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
    },
  };
}

export async function applyUpdatesTransaction(db, updates) {
  if (updates.length === 0) {
    return {
      updated: 0,
      conflicts: 0,
    };
  }

  return db.$transaction(
    async (tx) => {
      let updated = 0;
      let conflicts = 0;

      for (const change of updates) {
        // Update only if the database record still
        // matches the values originally inspected.
        const result = await tx.match.updateMany({
          where: {
            id: change.id,
            status: change.original.status,
            homeScore: change.original.homeScore,
            awayScore: change.original.awayScore,
          },
          data: change.data,
        });

        if (result.count === 1) {
          updated++;
        } else {
          conflicts++;
        }
      }

      return {
        updated,
        conflicts,
      };
    },
    {
      maxWait: 10000,
      timeout: 60000,
    }
  );
}
