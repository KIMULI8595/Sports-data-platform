import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  inspectSyncLock,
  withSyncLock,
} from './football-sync-lock.mjs';

const root = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-lock-test-')
);

try {
  const lockPath = path.join(
    root,
    '.football-sync.lock'
  );

  await fs.mkdir(lockPath);

  await fs.writeFile(
    path.join(lockPath, 'owner.json'),
    JSON.stringify({
      pid: 2147483647,
      hostname: os.hostname(),
      startedAt: '2020-01-01T00:00:00.000Z',
    })
  );

  const inspection = await inspectSyncLock(root);

  console.log('Lock status:', inspection.status);

  if (inspection.status !== 'stale') {
    throw new Error('Stale lock detection failed');
  }

  try {
    await withSyncLock(root, async () => {});
    throw new Error('Lock protection failed');
  } catch (error) {
    if (error.name !== 'LockBusyError') {
      throw error;
    }

    console.log('Stale lock correctly blocked');
  }

  console.log('LOCK TEST PASSED');
} finally {
  await fs.rm(root, {
    recursive: true,
    force: true,
  });
}
