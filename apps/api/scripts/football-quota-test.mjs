import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { reserveApiRequest, inspectQuotaLock } from './football-api-quota.mjs';

const root = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-quota-test-')
);

try {
  const budget = 3;

  const reservations = await Promise.all([
    reserveApiRequest({ root, budget }),
    reserveApiRequest({ root, budget }),
    reserveApiRequest({ root, budget }),
  ]);

  const usage = reservations.map(item => item.used).sort((a, b) => a - b);

  assert.deepEqual(usage, [1, 2, 3]);
  console.log('Reservations:', usage);

  const state = JSON.parse(
    await fs.readFile(
      path.join(root, '.football-api-usage.json'),
      'utf8'
    )
  );

  assert.equal(state.used, 3);
  console.log('Final usage:', state.used);

  await assert.rejects(
    reserveApiRequest({ root, budget }),
    /Local API budget reached/
  );

  console.log('Fourth request correctly blocked');

  const lock = await inspectQuotaLock(root);
  assert.equal(lock.status, 'absent');

  console.log('Quota lock cleaned up correctly');

  const staleRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'football-stale-lock-test-')
  );

  try {
    const staleLockPath = path.join(
      staleRoot,
      '.football-api-quota.lock'
    );

    await fs.mkdir(staleLockPath);

    await fs.writeFile(
      path.join(staleLockPath, 'owner.json'),
      JSON.stringify({
        pid: 2147483647,
        hostname: os.hostname(),
        startedAt: '2020-01-01T00:00:00.000Z',
        reservationId: 'test-stale-owner',
      })
    );

    const stale = await inspectQuotaLock(staleRoot);

    assert.equal(stale.status, 'stale');
    console.log('Stale lock detected correctly');

    await assert.rejects(
      reserveApiRequest({
        root: staleRoot,
        budget,
        lockTimeoutMs: 200,
      }),
      /API quota lock unavailable: stale/
    );

    console.log('Stale lock correctly blocked');
  } finally {
    await fs.rm(staleRoot, {
      recursive: true,
      force: true,
    });
  }

  console.log('QUOTA TEST PASSED');
} finally {
  await fs.rm(root, {
    recursive: true,
    force: true,
  });
}
