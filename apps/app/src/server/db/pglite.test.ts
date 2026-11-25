import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LockError } from "../lock";
import { openDatabase, pgliteFolder, schema } from ".";
import { expectedColumns, publicColumns } from "./testing";

let dataDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "tailory-db-"));
});

afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

const installId = async (db: Awaited<ReturnType<typeof openDatabase>>["db"]) => {
  const rows = await db
    .select({ value: schema.appMeta.value })
    .from(schema.appMeta)
    .where(eq(schema.appMeta.key, "install_id"));
  return rows[0]?.value;
};

describe("openDatabase with PGlite", () => {
  it("creates the database in the data dir and applies the migrations", async () => {
    const database = await openDatabase({ dataDir });
    try {
      expect(database.driver).toBe("pglite");
      expect(existsSync(pgliteFolder(dataDir))).toBe(true);
      expect(await publicColumns(database.db)).toEqual(expectedColumns);
      expect(await installId(database.db)).toMatch(/^[0-9a-f-]{36}$/);
    } finally {
      await database.close();
    }
  });

  it("reopens an existing database without changing it", async () => {
    const first = await openDatabase({ dataDir });
    const id = await installId(first.db);
    await first.close();

    const second = await openDatabase({ dataDir });
    try {
      expect(await installId(second.db)).toBe(id);
      expect(await publicColumns(second.db)).toEqual(expectedColumns);
    } finally {
      await second.close();
    }
  });

  it("holds the lock while open and frees it on close", async () => {
    const database = await openDatabase({ dataDir });
    const lockFile = path.join(dataDir, "tailory.lock");
    expect(existsSync(lockFile)).toBe(true);
    await database.close();
    expect(existsSync(lockFile)).toBe(false);
  });

  it("frees the lock when migrations fail", async () => {
    await expect(
      openDatabase({ dataDir }, { migrationsFolder: path.join(dataDir, "missing") })
    ).rejects.toThrow();
    expect(existsSync(path.join(dataDir, "tailory.lock"))).toBe(false);
  });

  it("refuses a folder another process holds", async () => {
    const { writeFileSync } = await import("node:fs");
    const { hostname } = await import("node:os");
    writeFileSync(
      path.join(dataDir, "tailory.lock"),
      JSON.stringify({ pid: process.ppid, hostname: hostname() })
    );
    await expect(openDatabase({ dataDir })).rejects.toBeInstanceOf(LockError);
  });
});
