
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  withSyncLock,
  LockBusyError,
} from './football-sync-lock.mjs';

const directory = path.dirname(
  fileURLToPath(import.meta.url)
);

const apiRoot = path.resolve(directory, '..');

const configPath = path.join(
  directory,
  'football-sync-config.json'
);

const logPath = path.join(
  apiRoot,
  '.football-sync-log.jsonl'
);

// --------------------------------------------------
// Command-line validation
// --------------------------------------------------

const cliArgs = process.argv.slice(2);

const allowedArgs = new Set(['--once']);

if (
  cliArgs.some(arg => !allowedArgs.has(arg)) ||
  new Set(cliArgs).size !== cliArgs.length
) {
  console.error(
    'Usage: node scripts/football-sync-scheduler.mjs [--once]'
  );

  process.exit(1);
}

const once = cliArgs.includes('--once');

// --------------------------------------------------
// Scheduler state
// --------------------------------------------------

let stopping = false;
let activeCycle = null;
let timer = null;
let shutdownPromise = null;

// --------------------------------------------------
// Logging
// --------------------------------------------------

async function log(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  console.log(JSON.stringify(entry));

  await fs.appendFile(
    logPath,
    JSON.stringify(entry) + '\n'
  );
}

// --------------------------------------------------
// Date validation
// --------------------------------------------------

function validDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// --------------------------------------------------
// Configuration
// --------------------------------------------------

async function loadConfig() {
  const config = JSON.parse(
    await fs.readFile(configPath, 'utf8')
  );

  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config) ||
    typeof config.enabled !== 'boolean' ||
    !Number.isInteger(config.intervalMinutes) ||
    config.intervalMinutes < 5 ||
    !Number.isInteger(config.dailyBudget) ||
    config.dailyBudget < 1 ||
    config.dailyBudget > 100 ||
    !Array.isArray(config.jobs)
  ) {
    throw new Error(
      'Invalid scheduler configuration'
    );
  }

  for (const job of config.jobs) {
    if (
      !job ||
      typeof job !== 'object' ||
      Array.isArray(job) ||
      typeof job.name !== 'string' ||
      !job.name.trim() ||
      typeof job.enabled !== 'boolean' ||
      !Number.isInteger(job.league) ||
      job.league <= 0 ||
      !Number.isInteger(job.season) ||
      job.season < 2000 ||
      !validDate(job.from) ||
      !validDate(job.to) ||
      job.from > job.to
    ) {
      throw new Error(
        `Invalid job configuration: ${job?.name ?? 'unknown'}`
      );
    }
  }

  return config;
}

// --------------------------------------------------
// Child synchronization process
// --------------------------------------------------

function executeJob(job, budget) {
  return new Promise((resolve, reject) => {
    const args = [
      '--import',
      'tsx',
      'scripts/football-results-sync.mjs',
      '--league',
      String(job.league),
      '--season',
      String(job.season),
      '--from',
      job.from,
      '--to',
      job.to,
      '--budget',
      String(budget),
      '--apply',
    ];

    const child = spawn(
      process.execPath,
      args,
      {
        cwd: apiRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          FOOTBALL_SYNC_SCHEDULER_OWNER_PID:
            String(process.pid),
        },
        windowsHide: true,
      }
    );

    let settled = false;

    function finish(error) {
      if (settled) {
        return;
      }

      settled = true;

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }

    child.once('error', error => {
      finish(error);
    });

    child.once('close', (code, signal) => {
      if (code === 0) {
        finish();
      } else {
        finish(
          new Error(
            `Sync exited with code ${code}, ` +
            `signal ${signal ?? 'none'}`
          )
        );
      }
    });
  });
}

// --------------------------------------------------
// Synchronization cycle
// --------------------------------------------------

async function runCycle(config) {
  if (stopping) {
    await log('cycle_skipped', {
      reason: 'scheduler_stopping',
    });

    return;
  }

  if (!config.enabled) {
    await log('cycle_skipped', {
      reason: 'scheduler_disabled',
    });

    return;
  }

  const jobs = config.jobs.filter(
    job => job.enabled
  );

  if (jobs.length === 0) {
    await log('cycle_skipped', {
      reason: 'no_enabled_jobs',
    });

    return;
  }

  let failedJobs = 0;

  for (const job of jobs) {
    if (stopping) {
      await log('remaining_jobs_skipped', {
        reason: 'scheduler_stopping',
      });

      break;
    }

    await log('job_started', {
      name: job.name,
      league: job.league,
      season: job.season,
    });

    try {
      await executeJob(
        job,
        config.dailyBudget
      );

      await log('job_succeeded', {
        name: job.name,
      });
    } catch (error) {
      failedJobs++;

      await log('job_failed', {
        name: job.name,
        error: error.message,
      });
    }
  }

  if (failedJobs > 0) {
    throw new Error(
      `${failedJobs} synchronization job(s) failed`
    );
  }
}

// --------------------------------------------------
// Lock-protected cycle
// --------------------------------------------------

function startCycle(config) {
  if (stopping) {
    return Promise.resolve();
  }

  if (activeCycle) {
    console.log(
      'Scheduled cycle skipped: previous cycle still running'
    );

    return activeCycle;
  }

  const cycle = withSyncLock(
    apiRoot,
    () => runCycle(config)
  );

  activeCycle = cycle;

  void cycle.finally(() => {
    if (activeCycle === cycle) {
      activeCycle = null;
    }
  }).catch(() => {});

  return cycle;
}

// --------------------------------------------------
// Graceful shutdown
// --------------------------------------------------

function requestShutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  stopping = true;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  shutdownPromise = (async () => {
    try {
      await log('scheduler_stopping', {
        signal,
        waitingForActiveCycle:
          activeCycle !== null,
      });

      if (activeCycle) {
        try {
          await activeCycle;
        } catch (error) {
          process.exitCode = 1;

          console.error(
            'Active synchronization failed during shutdown:',
            error
          );
        }
      }

      await log('scheduler_stopped', {
        signal,
      });
    } catch (error) {
      process.exitCode = 1;

      console.error(
        'Scheduler shutdown failed:',
        error
      );
    }
  })();

  return shutdownPromise;
}

// --------------------------------------------------
// Lock contention handling
// --------------------------------------------------

async function runScheduledCycle(config) {
  try {
    await startCycle(config);
  } catch (error) {
    if (error instanceof LockBusyError) {
      await log('cycle_skipped', {
        reason: 'synchronization_lock_busy',
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

// --------------------------------------------------
// Scheduler entry point
// --------------------------------------------------

async function main() {
  process.once('SIGINT', () => {
    void requestShutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void requestShutdown('SIGTERM');
  });

  const config = await loadConfig();

  await log('scheduler_started', {
    enabled: config.enabled,
    intervalMinutes:
      config.intervalMinutes,
    jobs: config.jobs.length,
    mode: once
      ? 'once'
      : 'continuous',
  });

  if (stopping) {
    await requestShutdown('startup');
    return;
  }

  if (once) {
    await runScheduledCycle(config);
    return;
  }

  // An existing synchronization lock should
  // not terminate the continuous scheduler.
  await runScheduledCycle(config);

  if (stopping) {
    await requestShutdown('startup');
    return;
  }

  timer = setInterval(() => {
    if (stopping || activeCycle) {
      return;
    }

    void runScheduledCycle(config).catch(
      error => {
        process.exitCode = 1;

        console.error(
          'Scheduler cycle failed:',
          error
        );
      }
    );
  }, config.intervalMinutes * 60_000);
}

main().catch(error => {
  console.error(
    'Scheduler failed:',
    error
  );

  process.exitCode = 1;
});
