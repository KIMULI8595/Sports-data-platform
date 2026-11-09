
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  withSyncLock,
  inspectSyncLock,
} from './football-sync-lock.mjs';

import {
  SYNC_SCHEDULER_OWNER_ENV,
} from './football-sync-runner.mjs';

const root = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-owner-test-')
);

const runnerUrl = new URL(
  './football-sync-runner.mjs',
  import.meta.url
).href;

function runChild(ownerValue) {
  return new Promise((resolve, reject) => {
    const code = `
      import { runWithSyncGuard } from
        ${JSON.stringify(runnerUrl)};

      try {
        await runWithSyncGuard(
          ${JSON.stringify(root)},
          async () => {
            console.log('UNEXPECTED_GUARD_ACCEPTED');
          }
        );

        process.exitCode = 2;
      } catch (error) {
        console.log(
          'GUARD_REJECTED: ' + error.message
        );
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
        env: {
          ...process.env,
          [SYNC_SCHEDULER_OWNER_ENV]:
            ownerValue,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.once('error', reject);

    child.once('close', exitCode => {
      resolve({
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}

try {
  await withSyncLock(root, async () => {
    const before = await inspectSyncLock(root);

    assert.equal(before.status, 'active');
    assert.equal(before.owner.pid, process.pid);

    console.log('Parent lock acquired');

    // The child is actually launched by process.pid,
    // but falsely claims a different parent PID.
    const wrongPid = String(
      process.pid + 1000000
    );

    const wrongOwner = await runChild(
      wrongPid
    );

    assert.equal(
      wrongOwner.exitCode,
      0,
      wrongOwner.stderr
    );

    assert.match(
      wrongOwner.stdout,
      /GUARD_REJECTED: Scheduler parent process does not match/
    );

    assert.doesNotMatch(
      wrongOwner.stdout,
      /UNEXPECTED_GUARD_ACCEPTED/
    );

    console.log(
      'Incorrect parent PID rejected'
    );

    const invalidOwner = await runChild(
      'not-a-pid'
    );

    assert.equal(
      invalidOwner.exitCode,
      0,
      invalidOwner.stderr
    );

    assert.match(
      invalidOwner.stdout,
      /GUARD_REJECTED: Invalid scheduler owner PID/
    );

    assert.doesNotMatch(
      invalidOwner.stdout,
      /UNEXPECTED_GUARD_ACCEPTED/
    );

    console.log(
      'Malformed owner PID rejected'
    );

    const after = await inspectSyncLock(root);

    assert.equal(after.status, 'active');
    assert.equal(after.owner.pid, process.pid);

    console.log(
      'Parent lock remained active'
    );
  });

  const final = await inspectSyncLock(root);

  assert.equal(final.exists, false);

  console.log('Parent lock released');
  console.log(
    'INVALID LOCK OWNERSHIP TEST PASSED'
  );
} catch (error) {
  console.error(
    'INVALID LOCK OWNERSHIP TEST FAILED:',
    error
  );

  process.exitCode = 1;
} finally {
  await fs.rm(root, {
    recursive: true,
    force: true,
  });
}
