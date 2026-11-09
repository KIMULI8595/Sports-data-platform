
/**
 * Synchronize results for existing API-Football fixtures.
 *
 * Run using npx tsx.
 * Dry-run by default. Add --apply to update PostgreSQL.
 *
 * Safety:
 * - Synchronization lock required.
 * - Imported season verified before API requests.
 * - API requests reserved against the daily quota.
 * - Only matches belonging to the imported season are considered.
 * - Live fixtures and finalized scores are protected.
 * - Updates use a transactional conditional-write policy.
 *
 * API requests count against quota even in dry-run mode.
 */

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

import {
  DAILY_LIMIT,
  PROVIDER,
  validDate,
} from './football-ingest-core.mjs';

import {
  reserveApiRequest,
} from './football-api-quota.mjs';

import {
  assessFixture,
  applyUpdatesTransaction,
} from './football-results-policy.mjs';

import {
  runWithSyncGuard,
} from './football-sync-runner.mjs';

const directory = path.dirname(
  fileURLToPath(import.meta.url)
);

const apiRoot = path.resolve(directory, '..');

// Load apps/api/.env independently of the current
// working directory.
//
// Preserve existing environment variables supplied
// by Windows, the terminal, or the scheduler.
loadEnv({
  path: path.join(apiRoot, '.env'),
  override: false,
  quiet: true,
});

const args = process.argv.slice(2);

const usage = `
Usage:
  npx tsx scripts/football-results-sync.mjs \\
    --league 585 \\
    --season 2024 \\
    --from 2024-07-01 \\
    --to 2025-07-31 \\
    [--budget 20] [--apply]

Without --apply, the script previews changes.
Dry runs still consume API quota.
`;

if (args.includes('--help') || args.includes('-h')) {
  console.log(usage);
  process.exit(0);
}

const allowedFlags = new Set([
  '--league',
  '--season',
  '--from',
  '--to',
  '--budget',
  '--apply',
]);

function option(key, fallback) {
  const index = args.indexOf(key);

  if (index < 0) {
    return fallback;
  }

  if (
    index + 1 >= args.length ||
    args[index + 1].startsWith('--')
  ) {
    throw new Error(`Missing value for ${key}`);
  }

  return args[index + 1];
}

function validateArguments() {
  for (const arg of args) {
    if (
      arg.startsWith('--') &&
      !allowedFlags.has(arg)
    ) {
      throw new Error(
        `Unknown option: ${arg}`
      );
    }
  }

  for (const key of [
    '--league',
    '--season',
    '--from',
    '--to',
    '--budget',
  ]) {
    if (args.filter(arg => arg === key).length > 1) {
      throw new Error(
        `Duplicate option: ${key}`
      );
    }
  }

  const league = Number(
    option(
      '--league',
      process.env.API_FOOTBALL_LEAGUE_ID
    )
  );

  const season = Number(
    option(
      '--season',
      process.env.API_FOOTBALL_SEASON
    )
  );

  const from = option('--from', '');
  const to = option('--to', '');

  const budget = Number(
    option(
      '--budget',
      process.env.API_FOOTBALL_DAILY_BUDGET || '20'
    )
  );

  const apply = args.includes('--apply');

  if (
    !Number.isInteger(league) ||
    league <= 0 ||
    !Number.isInteger(season) ||
    season < 2000 ||
    !validDate(from) ||
    !validDate(to) ||
    from > to ||
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > DAILY_LIMIT
  ) {
    throw new Error(
      'Invalid synchronization arguments'
    );
  }

  return {
    league,
    season,
    from,
    to,
    budget,
    apply,
  };
}

async function findImportedSeason(
  db,
  league,
  season
) {
  const seasonMap =
    await db.externalEntityMap.findUnique({
      where: {
        providerCode_entityType_externalId: {
          providerCode: PROVIDER,
          entityType: 'season',
          externalId: `${league}:${season}`,
        },
      },
    });

  if (!seasonMap) {
    throw new Error(
      'Season not imported locally. ' +
      'Refusing to request provider fixtures.'
    );
  }

  const localSeason = await db.season.findUnique({
    where: {
      id: seasonMap.internalId,
    },
  });

  if (!localSeason) {
    throw new Error(
      'Imported season mapping references ' +
      'a missing local season.'
    );
  }

  return localSeason;
}

async function fetchFixtures(config, apiKey) {
  const reservation = await reserveApiRequest({
    root: apiRoot,
    budget: config.budget,
  });

  const endpoint = new URL(
    'https://v3.football.api-sports.io/fixtures'
  );

  for (const [key, value] of Object.entries({
    league: config.league,
    season: config.season,
    from: config.from,
    to: config.to,
  })) {
    endpoint.searchParams.set(
      key,
      String(value)
    );
  }

  const response = await fetch(endpoint, {
    headers: {
      'x-apisports-key': apiKey,
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(
      `Provider HTTP ${response.status}`
    );
  }

  const payload = await response.json();

  if (
    payload.errors &&
    Object.keys(payload.errors).length > 0
  ) {
    throw new Error(
      'Provider API error: ' +
      JSON.stringify(payload.errors)
    );
  }

  const remainingHeader = response.headers.get(
    'x-ratelimit-requests-remaining'
  );

  if (remainingHeader !== null) {
    const remaining = Number(remainingHeader);

    if (
      Number.isFinite(remaining) &&
      remaining <= 0
    ) {
      throw new Error(
        'Provider daily quota exhausted'
      );
    }
  }

  if (!Array.isArray(payload.response)) {
    throw new Error(
      'Invalid provider response: ' +
      'expected fixtures array'
    );
  }

  return {
    fixtures: payload.response,
    requestsUsed: reservation.used,
  };
}

async function synchronize(db, config, apiKey) {
  // Validate the local season before consuming
  // any API-Football quota.
  const localSeason = await findImportedSeason(
    db,
    config.league,
    config.season
  );

  const {
    fixtures,
    requestsUsed,
  } = await fetchFixtures(config, apiKey);

  const fixtureIds = [
    ...new Set(
      fixtures
        .filter(
          item => item?.fixture?.id != null
        )
        .map(
          item => String(item.fixture.id)
        )
    ),
  ];

  const mappings = fixtureIds.length
    ? await db.externalEntityMap.findMany({
        where: {
          providerCode: PROVIDER,
          entityType: 'match',
          externalId: {
            in: fixtureIds,
          },
        },
      })
    : [];

  const mappedIds = new Map(
    mappings.map(mapping => [
      mapping.externalId,
      mapping.internalId,
    ])
  );

  // This is the season-isolation boundary.
  const matches = mappings.length
    ? await db.match.findMany({
        where: {
          id: {
            in: mappings.map(
              mapping => mapping.internalId
            ),
          },
          seasonId: localSeason.id,
        },
      })
    : [];

  const byId = new Map(
    matches.map(match => [
      match.id,
      match,
    ])
  );

  const summary = {
    provider: PROVIDER,
    league: config.league,
    season: config.season,
    from: config.from,
    to: config.to,
    dryRun: !config.apply,
    fetched: fixtures.length,
    eligible: 0,
    unchanged: 0,
    skipped: 0,
    conflicts: 0,
    updated: 0,
    localRequestsUsedToday: requestsUsed,
    examples: [],
  };

  const updates = [];
  const seenMatchIds = new Set();

  for (const item of fixtures) {
    const externalId = String(
      item?.fixture?.id ?? ''
    );

    const internalId = mappedIds.get(
      externalId
    );

    const match = byId.get(internalId);

    if (!match) {
      summary.skipped++;
      continue;
    }

    // Prevent duplicate provider entries from
    // producing multiple writes to one match.
    if (seenMatchIds.has(match.id)) {
      summary.conflicts++;
      continue;
    }

    seenMatchIds.add(match.id);

    const assessment = assessFixture(
      match,
      item
    );

    if (assessment.kind === 'skipped') {
      summary.skipped++;
      continue;
    }

    if (assessment.kind === 'conflict') {
      summary.conflicts++;
      continue;
    }

    if (assessment.kind === 'unchanged') {
      summary.unchanged++;
      continue;
    }

    if (assessment.kind !== 'eligible') {
      throw new Error(
        'Unexpected fixture assessment result'
      );
    }

    updates.push({
      id: match.id,
      externalId,
      original: assessment.original,
      data: assessment.data,
    });

    summary.eligible++;

    if (summary.examples.length < 8) {
      summary.examples.push({
        matchId: match.id,
        providerFixtureId: externalId,
        before: assessment.original,
        after: assessment.data,
      });
    }
  }

  if (config.apply) {
    const result = await applyUpdatesTransaction(
      db,
      updates
    );

    summary.updated = result.updated;
    summary.conflicts += result.conflicts;
  }

  console.log(
    JSON.stringify(summary, null, 2)
  );
}

async function main() {
  const config = validateArguments();

  const apiKey = process.env.API_FOOTBALL_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!apiKey || !databaseUrl) {
    throw new Error(
      'Set API_FOOTBALL_KEY and DATABASE_URL ' +
      'in apps/api/.env'
    );
  }

  return runWithSyncGuard(
    apiRoot,
    async () => {
      const db = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: databaseUrl,
        }),
      });

      try {
        await synchronize(
          db,
          config,
          apiKey
        );
      } finally {
        await db.$disconnect();
      }
    }
  );
}

try {
  await main();
} catch (error) {
  console.error(
    'Results synchronization failed:',
    error.message
  );

  process.exitCode = 1;
}
