
// Conservative fixture importer.
// Existing match states, scores, events, and corrections are preserved.

import { config as loadEnv } from 'dotenv';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

import {
  DAILY_LIMIT,
  PROVIDER,
  slug,
  validDate,
  fixtureWindow,
} from './football-ingest-core.mjs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  reserveApiRequest,
} from './football-api-quota.mjs';

// Resolve paths relative to this script, not the terminal's
// current working directory.
const scriptDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const apiRoot = path.resolve(scriptDirectory, '..');

// Load apps/api/.env explicitly.
//
// dotenv does not overwrite environment variables already set
// by Windows, the terminal, or a deployment service.
loadEnv({
  path: path.join(apiRoot, '.env'),
  override: false,
  quiet: true,
});

const apiKey = process.env.API_FOOTBALL_KEY;
const url = process.env.DATABASE_URL;

if (!apiKey || !url) {
  console.error(
    'Set API_FOOTBALL_KEY and DATABASE_URL in apps/api/.env'
  );
  process.exit(1);
}

const args = process.argv.slice(2);

const option = (key, fallback) => {
  const index = args.indexOf(key);
  return index < 0 ? fallback : args[index + 1];
};

const league = Number(
  option('--league', process.env.API_FOOTBALL_LEAGUE_ID)
);

const seasonYear = Number(
  option('--season', process.env.API_FOOTBALL_SEASON)
);

const [today, tomorrow] = fixtureWindow();

const from = option('--from', today);
const to = option('--to', tomorrow);

const budget = Number(
  option(
    '--budget',
    process.env.API_FOOTBALL_DAILY_BUDGET || '20'
  )
);

const dryRun = args.includes('--dry-run');

if (
  !Number.isInteger(league) ||
  league <= 0 ||
  !Number.isInteger(seasonYear) ||
  seasonYear < 2000 ||
  !validDate(from) ||
  !validDate(to) ||
  from > to ||
  !Number.isInteger(budget) ||
  budget < 1 ||
  budget > DAILY_LIMIT
) {
  console.error(
    'Usage: node scripts/football-ingest.mjs ' +
    '--league <provider league ID> ' +
    '--season <start year> ' +
    '[--from YYYY-MM-DD --to YYYY-MM-DD] ' +
    '[--budget 20] [--dry-run]'
  );

  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url,
  }),
});

let requestsUsedToday = 0;

async function fetchApi(endpoint, params) {
  // All ingestion and synchronization scripts share
  // the same API quota state in apps/api.
  const reservation = await reserveApiRequest({
    root: apiRoot,
    budget,
  });

  requestsUsedToday = reservation.used;

  const requestUrl = new URL(
    'https://v3.football.api-sports.io/' + endpoint
  );

  for (const [key, value] of Object.entries(params)) {
    requestUrl.searchParams.set(key, String(value));
  }

  const response = await fetch(requestUrl, {
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
    Object.keys(payload.errors).length
  ) {
    throw new Error(
      'Provider returned an API error: ' +
      JSON.stringify(payload.errors)
    );
  }

  const remaining = Number(
    response.headers.get(
      'x-ratelimit-requests-remaining'
    )
  );

  if (
    Number.isFinite(remaining) &&
    remaining <= 0
  ) {
    throw new Error(
      'Provider daily quota exhausted'
    );
  }

  return payload.response || [];
}

async function mapped(type, externalId, create) {
  const key = {
    providerCode: PROVIDER,
    entityType: type,
    externalId: String(externalId),
  };

  const existing = await db.externalEntityMap.findUnique({
    where: {
      providerCode_entityType_externalId: key,
    },
  });

  if (existing) {
    return existing.internalId;
  }

  const internalId = await create();

  try {
    await db.externalEntityMap.create({
      data: {
        ...key,
        internalId,
      },
    });
  } catch (error) {
    if (error.code !== 'P2002') {
      throw error;
    }

    const mapping =
      await db.externalEntityMap.findUniqueOrThrow({
        where: {
          providerCode_entityType_externalId: key,
        },
      });

    return mapping.internalId;
  }

  return internalId;
}

async function run() {
  const info = await fetchApi('leagues', {
    id: league,
    season: seasonYear,
  });

  const entry = info[0];

  if (!entry) {
    throw new Error(
      'League or season not available in this account. ' +
      'Check coverage and free-season restrictions.'
    );
  }

  const fixtures = await fetchApi('fixtures', {
    league,
    season: seasonYear,
    from,
    to,
  });

  console.log(
    JSON.stringify(
      {
        provider: PROVIDER,
        league: entry.league?.name,
        season: seasonYear,
        fixtures: fixtures.length,
        requestCount: requestsUsedToday,
        dryRun,
      },
      null,
      2
    )
  );

  if (dryRun) {
    return;
  }

  const sport = await db.sport.upsert({
    where: {
      code: 'FOOTBALL',
    },
    create: {
      name: 'Football',
      slug: 'football',
      code: 'FOOTBALL',
    },
    update: {},
  });

  const compId = await mapped(
    'competition',
    league,
    async () => {
      const competition = await db.competition.create({
        data: {
          sportId: sport.id,
          name: entry.league.name,
          shortName: entry.league.name.slice(0, 80),
          slug:
            `api-football-${league}-` +
            slug(entry.league.name),
          type:
            entry.league.type === 'Cup'
              ? 'cup'
              : 'league',
        },
      });

      return competition.id;
    }
  );

  const seasonInfo = entry.seasons?.find(
    season => season.year === seasonYear
  );

  if (!seasonInfo?.start || !seasonInfo?.end) {
    throw new Error(
      'Provider season dates missing; refusing to guess.'
    );
  }

  const seasonId = await mapped(
    'season',
    `${league}:${seasonYear}`,
    async () => {
      const season = await db.season.create({
        data: {
          competitionId: compId,
          name: String(seasonYear),
          startDate: new Date(
            seasonInfo.start + 'T00:00:00Z'
          ),
          endDate: new Date(
            seasonInfo.end + 'T00:00:00Z'
          ),
          isCurrent: !!seasonInfo.current,
        },
      });

      return season.id;
    }
  );

  let inserted = 0;
  let skipped = 0;

  for (const item of fixtures) {
    const home = item.teams?.home;
    const away = item.teams?.away;

    if (
      !home?.id ||
      !away?.id ||
      !item.fixture?.id ||
      !item.fixture?.date ||
      home.id === away.id
    ) {
      skipped++;
      continue;
    }

    const teamId = async team =>
      mapped('team', team.id, async () => {
        const createdTeam = await db.team.create({
          data: {
            sportId: sport.id,
            name: team.name,
            shortName: team.name.slice(0, 80),
            slug:
              `api-football-${team.id}-` +
              slug(team.name),
            logoUrl: team.logo || null,
          },
        });

        return createdTeam.id;
      });

    const homeId = await teamId(home);
    const awayId = await teamId(away);

    for (const id of [homeId, awayId]) {
      await db.seasonTeam.upsert({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId: id,
          },
        },
        create: {
          seasonId,
          teamId: id,
        },
        update: {},
      });
    }

    const externalId = String(item.fixture.id);

    const existing =
      await db.externalEntityMap.findUnique({
        where: {
          providerCode_entityType_externalId: {
            providerCode: PROVIDER,
            entityType: 'match',
            externalId,
          },
        },
      });

    if (existing) {
      // Preserve existing match state, score,
      // events, and manual corrections.
      skipped++;
      continue;
    }

    await mapped('match', externalId, async () => {
      const match = await db.match.create({
        data: {
          seasonId,
          homeTeamId: homeId,
          awayTeamId: awayId,
          scheduledStart: new Date(
            item.fixture.date
          ),
          status: 'scheduled',
        },
      });

      return match.id;
    });

    inserted++;
  }

  console.log(
    JSON.stringify({
      inserted,
      skipped,
      notes:
        'Scores and events intentionally not overwritten; ' +
        'initial fixture import only.',
    })
  );
}

try {
  await run();
} catch (error) {
  console.error(
    'Ingestion failed:',
    error.message
  );

  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
