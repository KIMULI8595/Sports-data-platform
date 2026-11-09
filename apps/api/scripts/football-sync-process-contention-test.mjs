
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  inspectSyncLock,
} from './football-sync-lock.mjs';

const root = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-process-lock-test-')
);

const runnerUrl = new URL(
  './football-sync-runner.mjs',
  import.meta.url
).href;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const childEnvironment = {
  ...process.env,
};

// Remove scheduler ownership entirely.
// An empty value would cause the guard to reject
// manual execution.
delete childEnvironment.FOOTBALL_SYNC_SCHEDULER_OWNER_PID;

function launchChild(mode) {
  const code = `
    import { runWithSyncGuard } from
      ${JSON.stringify(runnerUrl)};

    const sleep = ms =>
      new Promise(resolve => setTimeout(resolve, ms));

    try {
      await runWithSyncGuard(
        ${JSON.stringify(root)},
        async () => {
          console.log('LOCK_ACQUIRED');

          if (${JSON.stringify(mode)} === 'holder') {
            await sleep(3000);
          }

          console.log('WORK_COMPLETED');
        }
      );
    } catch (error) {
      if (error.name === 'LockBusyError') {
        console.log('LOCK_BUSY');
      } else {
        console.error(error);
        process.exitCode = 1;
      }
    }
  `;

  const child = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      code,
    ],
    {
      env: childEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  let stdout = '';
  let stderr = '';
  let settled = false;

  const done = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.once('error', error => {
      settled = true;
      reject(error);
    });

    child.once('close', (exitCode, signal) => {
      settled = true;

      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
      });
    });
  });

  // Avoid unhandled rejections if startup fails
  // before the test reaches the await.
  void done.catch(() => {});

  return {
    child,
    done,
    getOutput: () => stdout,
    getErrors: () => stderr,
    isSettled: () => settled,
  };
}

async function waitForLock(holder) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const inspection = await inspectSyncLock(root);

    if (
      inspection.status === 'active' &&
      inspection.owner?.pid === holder.child.pid
    ) {
      return inspection;
    }

    if (holder.isSettled()) {
      const result = await holder.done;

      throw new Error(
        'Holder process exited before acquiring lock.\n' +
        `Exit code: ${result.exitCode}\n` +
        `STDOUT:\n${result.stdout}\n` +
        `STDERR:\n${result.stderr}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    'Timed out waiting for holder lock.\n' +
    `STDOUT:\n${holder.getOutput()}\n` +
    `STDERR:\n${holder.getErrors()}`
  );
}

let holder = null;
let contender = null;

try {
  console.log(
    'Starting independent-process contention test'
  );

  holder = launchChild('holder');

  const active = await waitForLock(holder);

  assert.equal(
    active.status,
    'active'
  );

  assert.equal(
    active.owner.pid,
    holder.child.pid
  );

  console.log(
    'First process acquired lock'
  );

  contender = launchChild('contender');

  const contenderResult = await contender.done;

  assert.equal(
    contenderResult.exitCode,
    0,
    contenderResult.stderr
  );

  assert.match(
    contenderResult.stdout,
    /LOCK_BUSY/
  );

  assert.doesNotMatch(
    contenderResult.stdout,
    /LOCK_ACQUIRED/
  );

  console.log(
    'Second independent process correctly blocked'
  );

  // The holder must still own the lock.
  const during = await inspectSyncLock(root);

  assert.equal(
    during.status,
    'active'
  );

  assert.equal(
    during.owner.pid,
    holder.child.pid
  );

  console.log(
    'First process retained lock'
  );

  const holderResult = await holder.done;

  assert.equal(
    holderResult.exitCode,
    0,
    holderResult.stderr
  );

  assert.match(
    holderResult.stdout,
    /LOCK_ACQUIRED/
  );

  assert.match(
    holderResult.stdout,
    /WORK_COMPLETED/
  );

  console.log(
    'First process completed successfully'
  );

  const final = await inspectSyncLock(root);

  assert.equal(
    final.exists,
    false
  );

  console.log('Lock released');

  console.log(
    'INDEPENDENT PROCESS CONTENTION TEST PASSED'
  );
} catch (error) {
  console.error(
    'INDEPENDENT PROCESS CONTENTION TEST FAILED:',
    error
  );

  process.exitCode = 1;
} finally {
  // Ensure children are no longer running before
  // removing the temporary test directory.
  for (const processHandle of [contender, holder]) {
    if (!processHandle) {
      continue;
    }

    if (!processHandle.isSettled()) {
      processHandle.child.kill();
    }

    try {
      await processHandle.done;
    } catch {
      // Startup errors have already been reported.
    }
  }

  await fs.rm(root, {
    recursive: true,
    force: true,
  });
}
