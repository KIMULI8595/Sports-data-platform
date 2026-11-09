
/**
 * Shared synchronization execution guard.
 *
 * Manual execution:
 *   Acquires the synchronization lock.
 *
 * Scheduler execution:
 *   Verifies the active scheduler-owned lock
 *   and the current process's parent PID.
 *
 * No API-Football requests or database operations.
 */

import os from 'node:os';

import {
  withSyncLock,
  inspectSyncLock,
} from './football-sync-lock.mjs';

export const SYNC_SCHEDULER_OWNER_ENV =
  'FOOTBALL_SYNC_SCHEDULER_OWNER_PID';

function parseOwnerPid(value) {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const pid = Number(value);

  return Number.isSafeInteger(pid)
    ? pid
    : null;
}

export async function runWithSyncGuard(
  root,
  callback,
  options = {}
) {
  if (typeof callback !== 'function') {
    throw new TypeError(
      'Synchronization callback must be a function'
    );
  }

  const ownerValue =
    options.schedulerOwnerPid ??
    process.env[SYNC_SCHEDULER_OWNER_ENV];

  // An absent owner PID indicates a manual execution.
  // An invalid supplied PID must not silently fall
  // back to manual mode.
  if (ownerValue === undefined) {
    return withSyncLock(root, callback);
  }

  const schedulerOwnerPid = parseOwnerPid(
    ownerValue
  );

  if (schedulerOwnerPid === null) {
    throw new Error(
      'Invalid scheduler owner PID'
    );
  }

  // The child must have been launched directly
  // by the process claiming to own the lock.
  if (process.ppid !== schedulerOwnerPid) {
    throw new Error(
      'Scheduler parent process does not match ' +
      'the claimed lock owner'
    );
  }

  const inspection = await inspectSyncLock(root);

  if (
    !inspection.exists ||
    inspection.status !== 'active' ||
    inspection.owner?.hostname !== os.hostname() ||
    inspection.owner?.pid !== schedulerOwnerPid
  ) {
    throw new Error(
      'Scheduler synchronization lock ownership ' +
      'could not be verified'
    );
  }

  return callback();
}
