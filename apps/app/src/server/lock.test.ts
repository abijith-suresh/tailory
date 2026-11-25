import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { acquireLock, LockError } from "./lock";

let dir: string;
let lockPath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "tailory-lock-"));
  lockPath = path.join(dir, "tailory.lock");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const writeOwner = (owner: object) => writeFileSync(lockPath, JSON.stringify(owner));

/** A pid that is no longer running: a child that has already exited. */
const deadPid = () =>
  new Promise<number>((resolve) => {
    const child = spawn(process.execPath, ["-e", ""]);
    child.on("exit", () => resolve(child.pid as number));
  });

describe("acquireLock", () => {
  it("writes the owner, and release removes the file", () => {
    const lock = acquireLock(lockPath, dir);
    expect(JSON.parse(readFileSync(lockPath, "utf8"))).toMatchObject({
      pid: process.pid,
      hostname: hostname(),
    });
    lock.release();
    expect(existsSync(lockPath)).toBe(false);
    lock.release(); // a second release is a no-op
  });

  it("refuses a lock held by a running process and names it", () => {
    writeOwner({ pid: process.ppid, hostname: hostname(), startedAt: "2026-11-25T10:00:00.000Z" });
    expect(() => acquireLock(lockPath, "/data/pglite")).toThrow(LockError);
    expect(() => acquireLock(lockPath, "/data/pglite")).toThrow(
      `Another Tailory (process ${process.ppid} on ${hostname()}, started 2026-11-25T10:00:00.000Z) is using /data/pglite`
    );
  });

  it("refuses a second lock in the same folder until the first is released", () => {
    // The same process can't open the folder twice either; that's what the owner check is for.
    const first = acquireLock(lockPath, dir);
    writeOwner({ pid: process.ppid, hostname: hostname() });
    expect(() => acquireLock(lockPath, dir)).toThrow(LockError);
    first.release();
    // release() leaves a lock that isn't ours alone.
    expect(existsSync(lockPath)).toBe(true);
  });

  it("treats a lock from another machine as held", () => {
    writeOwner({ pid: process.pid, hostname: "some-other-host" });
    expect(() => acquireLock(lockPath, dir)).toThrow(/process \d+ on some-other-host/);
  });

  it("replaces a lock left by a process that has exited", async () => {
    writeOwner({ pid: await deadPid(), hostname: hostname() });
    const lock = acquireLock(lockPath, dir);
    expect(JSON.parse(readFileSync(lockPath, "utf8")).pid).toBe(process.pid);
    lock.release();
  });

  it("replaces a lock naming this process, as after a container restart", () => {
    writeOwner({ pid: process.pid, hostname: hostname() });
    acquireLock(lockPath, dir).release();
  });

  it("replaces an unreadable lock file", () => {
    writeFileSync(lockPath, "not json");
    acquireLock(lockPath, dir).release();
  });

  it("reports other filesystem errors as they are", () => {
    expect(() => acquireLock(path.join(dir, "missing", "tailory.lock"), dir)).toThrow(/ENOENT/);
  });
});
