import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const LOCK_NAME = '.football-sync.lock';
const OWNER_FILE = 'owner.json';

export class LockBusyError extends Error {
  constructor(message = 'Another synchronization process holds the lock') {
    super(message);
    this.name = 'LockBusyError';
  }
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return null;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    if (error.code === 'EPERM') return true;
    return null;
  }
}

export async function inspectSyncLock(root) {
  const lockPath = path.join(root, LOCK_NAME);

  let stats;

  try {
    stats = await fs.stat(lockPath);
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
        path.join(lockPath, OWNER_FILE),
        'utf8'
      )
    );
  } catch {
    return {
      exists: true,
      status: 'unknown',
      ageSeconds: Math.floor(
        (Date.now() - stats.birthtimeMs) / 1000
      ),
      reason: 'Owner metadata is missing or unreadable',
    };
  }

  if (
    !owner ||
    !Number.isInteger(owner.pid) ||
    typeof owner.hostname !== 'string'
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
      reason: 'Lock belongs to another hostname',
    };
  }

  const running = isProcessRunning(owner.pid);

  return {
    exists: true,
    status:
      running === true
        ? 'active'
        : running === false
          ? 'stale'
          : 'unknown',
    owner,
  };
}

export async function withSyncLock(root, callback) {
  const lockPath = path.join(root, LOCK_NAME);

  try {
    await fs.mkdir(lockPath);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }

    const inspection = await inspectSyncLock(root);

    throw new LockBusyError(
      `Synchronization lock unavailable: ${inspection.status}. ` +
      'Inspect the lock before attempting recovery.'
    );
  }

  try {
    const owner = {
      pid: process.pid,
      hostname: os.hostname(),
      startedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(lockPath, OWNER_FILE),
      JSON.stringify(owner, null, 2),
      { flag: 'wx' }
    );

    return await callback();
  } finally {
    await fs.rm(lockPath, {
      recursive: true,
      force: true,
    });
  }
}
