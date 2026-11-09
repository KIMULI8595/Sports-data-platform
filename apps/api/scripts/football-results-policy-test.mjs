
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assessFixture,
  applyUpdatesTransaction,
} from './football-results-policy.mjs';

// --------------------------------------------------
// Test helpers
// --------------------------------------------------

function makeMatch(overrides = {}) {
  return {
    id: 'match-1',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

function makeFixture(
  status = 'FT',
  home = 2,
  away = 1
) {
  return {
    fixture: {
      id: 1001,
      status: {
        short: status,
      },
    },
    goals: {
      home,
      away,
    },
  };
}

function makeChange(
  id = 'match-1',
  status = 'finished',
  homeScore = 2,
  awayScore = 1
) {
  return {
    id,
    original: {
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
    },
    data: {
      status,
      homeScore,
      awayScore,
    },
  };
}

// An in-memory transaction simulator.
// This never connects to PostgreSQL.
function makeFakeDb(initialRows, options = {}) {
  let rows = structuredClone(initialRows);
  let transactionCalls = 0;

  return {
    get rows() {
      return structuredClone(rows);
    },

    get transactionCalls() {
      return transactionCalls;
    },

    async $transaction(callback) {
      transactionCalls++;

      // Changes are made to a temporary working copy.
      // Commit only if the callback completes.
      const working = structuredClone(rows);

      const tx = {
        match: {
          async updateMany({ where, data }) {
            if (
              options.failOnId &&
              where.id === options.failOnId
            ) {
              throw new Error('Simulated database failure');
            }

            const row = working.find(
              item =>
                item.id === where.id &&
                item.status === where.status &&
                item.homeScore === where.homeScore &&
                item.awayScore === where.awayScore
            );

            if (!row) {
              return { count: 0 };
            }

            Object.assign(row, data);

            return { count: 1 };
          },
        },
      };

      const result = await callback(tx);

      // Commit the entire batch only after success.
      rows = working;

      return result;
    },
  };
}

// --------------------------------------------------
// Fixture protection tests
// --------------------------------------------------

test(
  '1. New finished result is eligible',
  () => {
    const match = makeMatch();
    const fixture = makeFixture('FT', 2, 1);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'eligible');
    assert.deepEqual(result.data, {
      status: 'finished',
      homeScore: 2,
      awayScore: 1,
    });
  }
);

test(
  '2. Finalized score differences are conflicts',
  () => {
    const match = makeMatch({
      status: 'finished',
      homeScore: 2,
      awayScore: 1,
    });

    const fixture = makeFixture('FT', 3, 1);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'conflict');
    assert.equal(
      result.reason,
      'finalized_score_difference'
    );
  }
);

test(
  '3. Matching finalized results remain unchanged',
  () => {
    const match = makeMatch({
      status: 'finished',
      homeScore: 2,
      awayScore: 1,
    });

    const fixture = makeFixture('FT', 2, 1);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'unchanged');
  }
);

test(
  '4. Live matches are protected',
  () => {
    const match = makeMatch({
      status: 'live',
    });

    const fixture = makeFixture('FT', 2, 1);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'conflict');
    assert.equal(result.reason, 'live_fixture');
  }
);

test(
  '5. Terminal status changes are blocked',
  () => {
    const match = makeMatch({
      status: 'finished',
      homeScore: 2,
      awayScore: 1,
    });

    const fixture = makeFixture('PST', null, null);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'conflict');
    assert.equal(
      result.reason,
      'terminal_status_change'
    );
  }
);

test(
  '6. Invalid final scores are skipped',
  () => {
    const match = makeMatch();
    const fixture = makeFixture('FT', null, 1);

    const result = assessFixture(match, fixture);

    assert.equal(result.kind, 'skipped');
    assert.equal(
      result.reason,
      'invalid_final_score'
    );
  }
);

// --------------------------------------------------
// Transaction tests
// --------------------------------------------------

test(
  '7. Eligible updates commit together',
  async () => {
    const db = makeFakeDb([
      makeMatch({ id: 'match-1' }),
      makeMatch({ id: 'match-2' }),
    ]);

    const result = await applyUpdatesTransaction(
      db,
      [
        makeChange('match-1'),
        makeChange('match-2'),
      ]
    );

    assert.equal(result.updated, 2);
    assert.equal(result.conflicts, 0);
    assert.equal(db.transactionCalls, 1);

    assert.equal(db.rows[0].status, 'finished');
    assert.equal(db.rows[1].status, 'finished');

    assert.equal(db.rows[0].homeScore, 2);
    assert.equal(db.rows[1].awayScore, 1);
  }
);

test(
  '8. Database failure rolls back entire batch',
  async () => {
    const originalRows = [
      makeMatch({ id: 'match-1' }),
      makeMatch({ id: 'match-2' }),
    ];

    const db = makeFakeDb(originalRows, {
      failOnId: 'match-2',
    });

    await assert.rejects(
      () => applyUpdatesTransaction(
        db,
        [
          makeChange('match-1'),
          makeChange('match-2'),
        ]
      ),
      /Simulated database failure/
    );

    assert.equal(db.transactionCalls, 1);

    // Neither update should be committed.
    assert.deepEqual(db.rows, originalRows);
  }
);
