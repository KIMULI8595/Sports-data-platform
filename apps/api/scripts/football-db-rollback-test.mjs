
/**
 * PostgreSQL rollback integration test.
 *
 * Uses a real imported match, but does not
 * permanently change its data.
 *
 * The test:
 * 1. Reads one finished match.
 * 2. Starts a real Prisma transaction.
 * 3. Temporarily changes its score.
 * 4. Reads the changed score inside the transaction.
 * 5. Throws an intentional error to force rollback.
 * 6. Confirms the original score is preserved.
 *
 * No API-Football requests.
 */

import 'dotenv/config';

import assert from 'node:assert/strict';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const SEASON_PUBLIC_ID =
  'f46e44cf-e0de-437a-96f2-3e5c66134777';

const ROLLBACK_MARKER =
  'EXPECTED_TEST_ROLLBACK';

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
    'At least one finished match must exist'
  );

  console.log(
    'Original match:',
    JSON.stringify(original)
  );

  const temporaryHomeScore =
    original.homeScore + 1;

  let rollbackObserved = false;

  try {
    await db.$transaction(
      async tx => {
        const updated = await tx.match.update({
          where: {
            id: original.id,
          },
          data: {
            homeScore: temporaryHomeScore,
          },
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
          },
        });

        assert.equal(
          updated.homeScore,
          temporaryHomeScore
        );

        const insideTransaction =
          await tx.match.findUnique({
            where: {
              id: original.id,
            },
            select: {
              homeScore: true,
            },
          });

        assert.equal(
          insideTransaction.homeScore,
          temporaryHomeScore
        );

        console.log(
          'Temporary score visible inside transaction:',
          temporaryHomeScore
        );

        // Intentional failure: Prisma must roll back.
        throw new Error(ROLLBACK_MARKER);
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );
  } catch (error) {
    if (error.message !== ROLLBACK_MARKER) {
      throw error;
    }

    rollbackObserved = true;

    console.log(
      'Intentional rollback triggered.'
    );
  }

  assert.equal(
    rollbackObserved,
    true,
    'Transaction must have rolled back'
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

  assert.deepEqual(
    after,
    original,
    'Match must be unchanged after rollback'
  );

  console.log(
    'Match after rollback:',
    JSON.stringify(after)
  );

  console.log(
    'POSTGRESQL ROLLBACK TEST PASSED'
  );
}

try {
  await main();
} catch (error) {
  console.error(
    'POSTGRESQL ROLLBACK TEST FAILED:',
    error.message
  );

  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
