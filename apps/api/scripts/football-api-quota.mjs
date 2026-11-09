
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  DAILY_LIMIT,
  quotaAllowed,
} from './football-ingest-core.mjs';

const LOCK_NAME = '.football-api-quota.lock';
const STATE_NAME = '.football-api-usage.json';

function processStatus(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return 'unknown';
  }

  try {
    process.kill(pid, 0);
    return 'active';
  } catch (error) {
    if (error.code === 'ESRCH') return 'stale';
    if (error.code === 'EPERM') return 'active';
    return 'unknown';
  }
}

export async function inspectQuotaLock(root = process.cwd()) {
  const lockPath = path.join(root, LOCK_NAME);

  try {
    await fs.stat(lockPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, status: 'absent' };
    }
    throw error;
  }

  let owner;

  try {
    owner = JSON.parse(
      await fs.readFile(
        path.join(lockPath, 'owner.json'),
        'utf8'
      )
    );
  } catch {
    return {
      exists: true,
      status: 'unknown',
      reason: 'Missing or invalid owner metadata',
    };
  }

  if (
    !owner ||
    typeof owner.hostname !== 'string' ||
    !Number.isInteger(owner.pid)
  ) {
    return {
      exists: true,
      status: 'unknown',
      reason: 'Invalid owner metadata',
    };
  }

  if (owner.hostname !== os.hostname()) {
    return {
      exists: true,
      status: 'unknown',
      owner,
      reason: 'Different hostname',
    };
  }

  return {
    exists: true,
    status: processStatus(owner.pid),
    owner,
  };
}

export async function reserveApiRequest({
  root = process.cwd(),
  budget = 20,
  lockTimeoutMs = 10000,
} = {}) {
  if (
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > DAILY_LIMIT
  ) {
    throw new Error('Invalid API daily budget');
  }

  const stateFile = path.join(root, STATE_NAME);
  const lockPath = path.join(root, LOCK_NAME);

  const started = Date.now();
  let acquired = false;

  while (!acquired) {
    try {
      await fs.mkdir(lockPath);
      acquired = true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      if (Date.now() - started >= lockTimeoutMs) {
        const inspection = await inspectQuotaLock(root);

        throw new Error(
          `API quota lock unavailable: ${inspection.status}. ` +
          'Inspect the lock before attempting recovery.'
        );
      }

      await sleep(100);
    }
  }

  const reservationId = randomUUID();

  try {
    const owner = {
      pid: process.pid,
      hostname: os.hostname(),
      startedAt: new Date().toISOString(),
      reservationId,
    };

    await fs.writeFile(
      path.join(lockPath, 'owner.json'),
      JSON.stringify(owner, null, 2),
      { flag: 'wx' }
    );

    let state;

    try {
      state = JSON.parse(
        await fs.readFile(stateFile, 'utf8')
      );
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      state = { date: '', used: 0 };
    }

    if (
      !state ||
      typeof state.date !== 'string' ||
      !Number.isInteger(state.used) ||
      state.used < 0
    ) {
      throw new Error('Invalid API usage state');
    }

    const today = new Date().toISOString().slice(0, 10);

    if (state.date !== today) {
      state = {
        date: today,
        used: 0,
      };
    }

    if (!quotaAllowed(state.used, budget)) {
      throw new Error(
        `Local API budget reached: ${state.used}/${budget}`
      );
    }

    const nextState = {
      date: state.date,
      used: state.used + 1,
    };

    const tempFile = path.join(
      root,
      `.football-api-usage.${reservationId}.tmp`
    );

    try {
      await fs.writeFile(
        tempFile,
        JSON.stringify(nextState, null, 2),
        { flag: 'wx' }
      );

      await fs.rename(tempFile, stateFile);
    } finally {
      await fs.rm(tempFile, { force: true });
    }

    return {
      date: nextState.date,
      used: nextState.used,
      remaining: budget - nextState.used,
    };
  } finally {
    if (acquired) {
      await fs.rm(lockPath, {
        recursive: true,
        force: true,
      });
    }
  }
}
