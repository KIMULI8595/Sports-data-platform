
/**
 * Read-only verification of imported football data.
 *
 * Does not:
 * - Call API-Football
 * - Modify PostgreSQL records
 * - Consume API request quota
 */

import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

import {
  PROVIDER,
} from './football-ingest-core.mjs';

const LEAGUE = 585;
const SEASON = 2024;
const EXPECTED_MATCHES = 240;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured.');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  const seasonMap =
    await db.externalEntityMap.findUnique({
      where: {
        providerCode_entityType_externalId: {
          providerCode: PROVIDER,
          entityType: 'season',
          externalId: `${LEAGUE}:${SEASON}`,
        },
      },
    });

  if (!seasonMap) {
    throw new Error(
      'Imported Uganda Premier League season not found.'
    );
  }

  const season = await db.season.findUnique({
    where: {
      id: seasonMap.internalId,
    },
    select: {
      id: true,
      publicId: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  if (!season) {
    throw new Error(
      'Season mapping exists but the season record is missing.'
    );
  }

  const matches = await db.match.findMany({
    where: {
      seasonId: season.id,
    },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  const statusCounts = {};

  for (const match of matches) {
    statusCounts[match.status] =
      (statusCounts[match.status] || 0) + 1;
  }

  const finishedMatches = matches.filter(
    match => match.status === 'finished'
  );

  const invalidScores = matches.filter(
    match =>
      !Number.isInteger(match.homeScore) ||
      !Number.isInteger(match.awayScore) ||
      match.homeScore < 0 ||
      match.awayScore < 0
  );

  const invalidTeams = matches.filter(
    match =>
      match.homeTeamId === match.awayTeamId
  );

  const totalMatches = matches.length;

  const report = {
    competition: 'Uganda Premier League',
    providerLeagueId: LEAGUE,
    providerSeason: SEASON,

    season: {
      id: season.id,
      publicId: season.publicId,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      status: season.status,
    },

    matches: {
      expected: EXPECTED_MATCHES,
      actual: totalMatches,
      finished: finishedMatches.length,
      byStatus: statusCounts,
      invalidScores: invalidScores.length,
      sameHomeAndAwayTeam: invalidTeams.length,
    },

    checks: {
      expectedMatchCount:
        totalMatches === EXPECTED_MATCHES,

      allMatchesFinished:
        finishedMatches.length === totalMatches,

      scoresValid:
        invalidScores.length === 0,

      teamsValid:
        invalidTeams.length === 0,
    },
  };

  console.log(
    JSON.stringify(report, null, 2)
  );

  const allPassed = Object.values(
    report.checks
  ).every(Boolean);

  if (!allPassed) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(
    'Football data verification failed:',
    error.message
  );

  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
