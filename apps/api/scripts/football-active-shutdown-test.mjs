import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { withSyncLock, inspectSyncLock } from './football-sync-lock.mjs';

const root = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-active-shutdown-')
);

let activeJob = null;
let stopping = false;
let activeCycle = null;

function runSimulatedJob() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['-e', 'setTimeout(() => process.exit(0), 6000)'],
      {
        stdio: 'ignore',
        windowsHide: true,
      }
    );

    child.once('error', reject);

    child.once('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Simulated job exited: ${code}`));
    });
  });
}

async function main() {
  try {
    activeCycle = withSyncLock(root, async () => {
      console.log('Simulated job started');
      activeJob = runSimulatedJob();
      await activeJob;
      console.log('Simulated job finished');
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const during = await inspectSyncLock(root);

    assert.equal(during.status, 'active');
    console.log('Lock active while job runs');

    stopping = true;
    console.log('Shutdown requested; waiting for active job');

    const started = Date.now();

    await activeCycle;

    const elapsed = Date.now() - started;

    assert.equal(stopping, true);
    assert.ok(elapsed >= 4500);

    console.log('Shutdown waited for active job');

    const after = await inspectSyncLock(root);

    assert.equal(after.status, 'absent');
    console.log('Lock released after job finished');

    console.log('ACTIVE SHUTDOWN TEST PASSED');
  } finally {
    await fs.rm(root, {
      recursive: true,
      force: true,
    });
  }
}

await main();
