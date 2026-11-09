
/**
 * PostgreSQL optimistic concurrency integration test.
 *
 * Uses a real finished match, but deliberately supplies
 * an incorrect original score so the conditional UPDATE
 * must match zero rows.
 *
 * Expected:
 * - updated: 0
 * - conflicts: 1
 * - match unchanged
 *
 * No API-Football requests.
 * No intended database changes.
 */

import 'dotenv/config';

import assert from 'node:assert/strict';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

import {
  applyUpdatesTransaction,
} from './football-results-policy.mjs';

const SEASON_PUBLIC_ID =
  'f46e44cf-e0de-437a-96f2-3e5c66134777';

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
  const season = await db.season.findUnique({
    where: {
      publicId: SEASON_PUBLIC_ID,
    },
    select: {
      id: true,
      name: true,
    },
  });

  assert.ok(
    season,
    'Imported season must exist'
  );

  const original = await db.match.findFirst({
    where: {
      seasonId: season.id,
      status: 'finished',
    },
    orderBy: {
      id: 'asc',
    },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
    },
  });

  assert.ok(
    original,
    'A finished match must exist'
  );

  console.log(
    'Original match:',
    JSON.stringify(original)
  );

  // Deliberately incorrect expected score.
  // The database has original.homeScore,
  // not original.homeScore + 1.
  const staleOriginal = {
    status: original.status,
    homeScore: original.homeScore + 1,
    awayScore: original.awayScore,
  };

  const attemptedUpdate = {
    id: original.id,
    original: staleOriginal,
    data: {
      status: 'finished',
      homeScore: original.homeScore + 5,
      awayScore: original.awayScore,
    },
  };

  console.log(
    'Attempting update with stale original values:',
    JSON.stringify(staleOriginal)
  );

  const result = await applyUpdatesTransaction(
    db,
    [attemptedUpdate]
  );

  console.log(
    'Transaction result:',
    JSON.stringify(result)
  );

  assert.deepEqual(
    result,
    {
      updated: 0,
      conflicts: 1,
    },
    'Stale update must be rejected'
  );

  const after = await db.match.findUnique({
    where: {
      id: original.id,
    },
    select: {
      id: true,
      status: true,
      homeScore: true,
      awayScore: true,
    },
  });

  console.log(
    'Match after attempted update:',
    JSON.stringify(after)
  );

  assert.deepEqual(
    after,
    original,
    'Match must remain unchanged'
  );

  console.log(
    'POSTGRESQL CONFLICT PROTECTION TEST PASSED'
  );
}

try {
  await main();
} catch (error) {
  console.error(
    'POSTGRESQL CONFLICT PROTECTION TEST FAILED:',
    error.message
  );

  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
