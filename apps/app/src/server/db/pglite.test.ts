import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deleteUser } from "../account";
import { LockError } from "../lock";
import { LOCAL_USER, openDatabase, pgliteFolder, schema } from ".";
import { COLUMNS_SNAPSHOT, columnsText, publicColumns } from "./testing";

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
      await expect(columnsText(await publicColumns(database.db))).toMatchFileSnapshot(
        COLUMNS_SNAPSHOT
      );
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
      await expect(columnsText(await publicColumns(second.db))).toMatchFileSnapshot(
        COLUMNS_SNAPSHOT
      );
    } finally {
      await second.close();
    }
  });

  it("creates local mode's user, once, and creates it again empty after a delete", async () => {
    const database = await openDatabase({ dataDir, mode: "local" });
    try {
      const users = () => database.db.select().from(schema.user);
      expect(await users()).toMatchObject([LOCAL_USER]);
      await database.db.insert(schema.session).values({
        id: "s1",
        token: "t1",
        userId: LOCAL_USER.id,
        expiresAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      });

      await deleteUser(database.db, LOCAL_USER.id);

      expect(await users()).toMatchObject([LOCAL_USER]);
      expect(await database.db.select().from(schema.session)).toEqual([]);
    } finally {
      await database.close();
    }
    const reopened = await openDatabase({ dataDir, mode: "local" });
    try {
      expect(await reopened.db.select().from(schema.user)).toHaveLength(1);
    } finally {
      await reopened.close();
    }
  });

  it("creates no user outside local mode", async () => {
    const database = await openDatabase({ dataDir });
    try {
      expect(await database.db.select().from(schema.user)).toEqual([]);
    } finally {
      await database.close();
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
