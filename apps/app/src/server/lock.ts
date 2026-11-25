import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { hostname } from "node:os";

// PGlite doesn't stop two processes from opening the same data folder, and two writers would
// corrupt it. Each process that opens a folder first creates this lock file exclusively.

type LockOwner = { pid: number; hostname: string; startedAt: string };

export type Lock = { path: string; release: () => void };

export class LockError extends Error {
  override name = "LockError";
}

const readOwner = (lockPath: string): LockOwner | null => {
  try {
    const owner = JSON.parse(readFileSync(lockPath, "utf8")) as Partial<LockOwner>;
    return typeof owner.pid === "number" && typeof owner.hostname === "string"
      ? { pid: owner.pid, hostname: owner.hostname, startedAt: String(owner.startedAt ?? "") }
      : null;
  } catch {
    return null;
  }
};

const isRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

/**
 * A lock file left by a process that is gone is stale. So is one naming this process's own pid,
 * which happens when a container restarts and the app is pid 1 again: this process can't have
 * written it, because it hasn't taken the lock yet. A lock from another machine (a shared
 * folder) can't be checked, so it counts as held.
 */
const isStale = (owner: LockOwner | null): boolean =>
  owner === null ||
  (owner.hostname === hostname() && (owner.pid === process.pid || !isRunning(owner.pid)));

const describe = (owner: LockOwner) =>
  `process ${owner.pid} on ${owner.hostname}${owner.startedAt ? `, started ${owner.startedAt}` : ""}`;

/** Takes the lock at `lockPath` or throws a LockError naming the process that holds it. */
export const acquireLock = (lockPath: string, folder: string): Lock => {
  const owner: LockOwner = {
    pid: process.pid,
    hostname: hostname(),
    startedAt: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd: number;
    try {
      fd = openSync(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const holder = readOwner(lockPath);
      if (holder && !isStale(holder)) {
        throw new LockError(
          `Another Tailory (${describe(holder)}) is using ${folder}. Stop it first, or pick another folder with --data-dir. If no Tailory is running, delete ${lockPath}.`
        );
      }
      try {
        unlinkSync(lockPath);
      } catch (unlinkError) {
        if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") throw unlinkError;
      }
      continue;
    }
    try {
      writeSync(fd, `${JSON.stringify(owner)}\n`);
    } finally {
      closeSync(fd);
    }
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      // Only remove the file if it is still ours.
      if (readOwner(lockPath)?.pid === owner.pid) unlinkSync(lockPath);
    };
    process.once("exit", release);
    return {
      path: lockPath,
      release: () => {
        process.off("exit", release);
        release();
      },
    };
  }
  throw new LockError(`Could not take the lock ${lockPath}; another process keeps recreating it.`);
};
