
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(
  fileURLToPath(import.meta.url)
);

const tempRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), 'football-scheduler-integration-')
);

const tempScripts = path.join(tempRoot, 'scripts');

let scheduler = null;
let schedulerDone = null;
let output = '';
let errors = '';

async function copyScript(filename) {
  await fs.copyFile(
    path.join(scriptsDirectory, filename),
    path.join(tempScripts, filename)
  );
}

try {
  await fs.mkdir(tempScripts, {
    recursive: true,
  });

  await copyScript('football-sync-scheduler.mjs');
  await copyScript('football-sync-lock.mjs');

  const config = {
    enabled: true,
    intervalMinutes: 60,
    dailyBudget: 20,
    jobs: [
      {
        name: 'Offline scheduler integration test',
        league: 585,
        season: 2099,
        from: '2099-01-01',
        to: '2099-12-31',
        enabled: true,
      },
    ],
  };

  await fs.writeFile(
    path.join(tempScripts, 'football-sync-config.json'),
    JSON.stringify(config, null, 2)
  );

  // The simulated child never accesses PostgreSQL
  // or contacts API-Football.
  const childScript = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs/promises';
    import os from 'node:os';
    import path from 'node:path';

    const ownerPid = Number(
      process.env.FOOTBALL_SYNC_SCHEDULER_OWNER_PID
    );

    assert.ok(
      Number.isInteger(ownerPid) && ownerPid > 0,
      'Missing scheduler owner PID'
    );

    assert.equal(
      process.ppid,
      ownerPid,
      'Child parent PID mismatch'
    );

    const lockPath = path.join(
      process.cwd(),
      '.football-sync.lock',
      'owner.json'
    );

    const owner = JSON.parse(
      await fs.readFile(lockPath, 'utf8')
    );

    assert.equal(owner.pid, ownerPid);
    assert.equal(owner.hostname, os.hostname());

    console.log('TEST_CHILD_LOCK_VERIFIED');
  `;

  await fs.writeFile(
    path.join(tempScripts, 'offline-child.mjs'),
    childScript
  );

  const schedulerPath = path.join(
    tempScripts,
    'football-sync-scheduler.mjs'
  );

  let source = await fs.readFile(
    schedulerPath,
    'utf8'
  );

  // Match the actual multiline argument array.
  const originalArgs = /const args = \[\s*'--import',\s*'tsx',\s*'scripts\/football-results-sync\.mjs',/;

  assert.match(
    source,
    originalArgs,
    'Could not identify scheduler child argument array'
  );

  // Replace only the copied scheduler's child command.
  // Keep all other job arguments and scheduler logic.
  source = source.replace(
    originalArgs,
    "const args = [\n      'scripts/offline-child.mjs',"
  );

  await fs.writeFile(
    schedulerPath,
    source
  );

  console.log('Starting isolated scheduler');

  scheduler = spawn(
    process.execPath,
    [
      'scripts/football-sync-scheduler.mjs',
      '--once',
    ],
    {
      cwd: tempRoot,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  scheduler.stdout.on('data', chunk => {
    output += chunk.toString();
  });

  scheduler.stderr.on('data', chunk => {
    errors += chunk.toString();
  });

  schedulerDone = new Promise((resolve, reject) => {
    scheduler.once('error', reject);

    scheduler.once('close', (code, signal) => {
      resolve({ code, signal });
    });
  });

  const result = await schedulerDone;

  assert.equal(
    result.code,
    0,
    `Scheduler exited unsuccessfully.\n${errors}\n${output}`
  );

  assert.match(
    output,
    /"event":"scheduler_started"/
  );

  assert.match(
    output,
    /TEST_CHILD_LOCK_VERIFIED/
  );

  console.log('Scheduler launched offline child');
  console.log('Child verified parent lock ownership');

  const lockPath = path.join(
    tempRoot,
    '.football-sync.lock'
  );

  const lockExists = await fs.access(lockPath).then(
    () => true,
    () => false
  );

  assert.equal(
    lockExists,
    false,
    'Synchronization lock was not released'
  );

  console.log('Synchronization lock released');

  console.log(
    'SCHEDULER-CHILD INTEGRATION TEST PASSED'
  );
} catch (error) {
  console.error(
    'SCHEDULER-CHILD INTEGRATION TEST FAILED:',
    error
  );

  if (errors) {
    console.error('Scheduler STDERR:', errors);
  }

  if (output) {
    console.error('Scheduler STDOUT:', output);
  }

  process.exitCode = 1;
} finally {
  if (scheduler && scheduler.exitCode === null) {
    scheduler.kill();

    if (schedulerDone) {
      try {
        await schedulerDone;
      } catch {
        // Preserve the original failure.
      }
    }
  }

  await fs.rm(tempRoot, {
    recursive: true,
    force: true,
  });
}
