
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

const scriptsDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const tempRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-startup-lock-test-')
);

const tempScripts = path.join(tempRoot, 'scripts');

async function copyScript(filename) {
  await fs.copyFile(
    path.join(scriptsDirectory, filename),
    path.join(tempScripts, filename)
  );
}

function runScheduler() {
  const child = spawn(
    process.execPath,
    [
      'scripts/football-sync-scheduler.mjs',
      '--once',
    ],
    {
      cwd: tempRoot,
      env: {
        ...process.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  let stdout = '';
  let stderr = '';

  const done = new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.once('error', reject);

    child.once('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stderr,
      });
    });
  });

  return {
    child,
    done,
  };
}

let scheduler = null;

try {
  await fs.mkdir(tempScripts, {
    recursive: true,
  });

  await copyScript('football-sync-scheduler.mjs');
  await copyScript('football-sync-lock.mjs');

  // Temporary configuration only.
  // No real synchronization job is enabled.
  const config = {
    enabled: false,
    intervalMinutes: 60,
    dailyBudget: 20,
    jobs: [],
  };

  await fs.writeFile(
    path.join(
      tempScripts,
      'football-sync-config.json'
    ),
    JSON.stringify(config, null, 2)
  );

  console.log('Starting startup-lock contention test');

  // Hold the temporary synchronization lock
  // while a separate scheduler process starts.
  await withSyncLock(tempRoot, async () => {
    const before = await inspectSyncLock(tempRoot);

    assert.equal(
      before.status,
      'active'
    );

    assert.equal(
      before.owner.pid,
      process.pid
    );

    console.log(
      'Independent process holds synchronization lock'
    );

    scheduler = runScheduler();

    const result = await scheduler.done;

    assert.equal(
      result.code,
      0,
      `Scheduler should exit successfully.\n` +
      `STDOUT:\n${result.stdout}\n` +
      `STDERR:\n${result.stderr}`
    );

    assert.match(
      result.stdout,
      /"event":"scheduler_started"/
    );

    assert.match(
      result.stdout,
      /"event":"cycle_skipped"/
    );

    assert.match(
      result.stdout,
      /"reason":"synchronization_lock_busy"/
    );

    assert.doesNotMatch(
      result.stdout,
      /"event":"job_started"/
    );

    console.log(
      'Scheduler skipped busy lock without failing'
    );

    // Scheduler must not remove another
    // process's synchronization lock.
    const during = await inspectSyncLock(tempRoot);

    assert.equal(
      during.status,
      'active'
    );

    assert.equal(
      during.owner.pid,
      process.pid
    );

    console.log(
      'Original lock ownership preserved'
    );
  });

  const after = await inspectSyncLock(tempRoot);

  assert.equal(
    after.exists,
    false
  );

  console.log(
    'Original lock released'
  );

  console.log(
    'SCHEDULER STARTUP LOCK TEST PASSED'
  );
} catch (error) {
  console.error(
    'SCHEDULER STARTUP LOCK TEST FAILED:',
    error
  );

  process.exitCode = 1;
} finally {
  if (
    scheduler &&
    scheduler.child.exitCode === null &&
    scheduler.child.signalCode === null
  ) {
    scheduler.child.kill();

    try {
      await scheduler.done;
    } catch {
      // Preserve the original failure.
    }
  }

  await fs.rm(tempRoot, {
    recursive: true,
    force: true,
  });
}
