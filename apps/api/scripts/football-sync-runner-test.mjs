
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  withSyncLock,
  inspectSyncLock,
} from './football-sync-lock.mjs';

import {
  runWithSyncGuard,
  SYNC_SCHEDULER_OWNER_ENV,
} from './football-sync-runner.mjs';

const directory = path.dirname(
  fileURLToPath(import.meta.url)
);

const temporaryRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-runner-test-')
);

function runChild(root, ownerPid) {
  return new Promise((resolve, reject) => {
    const childCode = `
      import { runWithSyncGuard } from
        ${JSON.stringify(
          new URL('./football-sync-runner.mjs', import.meta.url).href
        )};

      await runWithSyncGuard(
        ${JSON.stringify(root)},
        async () => {
          console.log('CHILD_GUARD_ACCEPTED');
        }
      );
    `;

    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        childCode,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          [SYNC_SCHEDULER_OWNER_ENV]: String(ownerPid),
        },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
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

    child.once('close', code => {
      resolve({
        code,
        stdout,
        stderr,
      });
    });
  });
}

try {
  console.log('Starting parent-child lock test');

  await withSyncLock(
    temporaryRoot,
    async () => {
      const inspection =
        await inspectSyncLock(temporaryRoot);

      assert.equal(
        inspection.status,
        'active'
      );

      assert.equal(
        inspection.owner.pid,
        process.pid
      );

      console.log('Parent synchronization lock active');

      const childResult = await runChild(
        temporaryRoot,
        process.pid
      );

      assert.equal(
        childResult.code,
        0,
        childResult.stderr
      );

      assert.match(
        childResult.stdout,
        /CHILD_GUARD_ACCEPTED/
      );

      console.log(
        'Child accepted verified parent-owned lock'
      );

      const inspectionAfterChild =
        await inspectSyncLock(temporaryRoot);

      assert.equal(
        inspectionAfterChild.status,
        'active'
      );

      console.log(
        'Parent lock remained active after child exit'
      );
    }
  );

  const finalInspection =
    await inspectSyncLock(temporaryRoot);

  assert.equal(
    finalInspection.exists,
    false
  );

  console.log('Parent lock released');
  console.log(
    'PARENT-CHILD LOCK INTEGRATION TEST PASSED'
  );
} catch (error) {
  console.error(
    'PARENT-CHILD LOCK INTEGRATION TEST FAILED:',
    error
  );

  process.exitCode = 1;
} finally {
  await fs.rm(
    temporaryRoot,
    {
      recursive: true,
      force: true,
    }
  );
}
