import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EMPTY_RESUME } from "@tailory/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createApplication,
  type DataContext,
  eraseUserData,
  replaceProfile,
  updateProfile,
} from "./data";
import { type Database, LOCAL_USER, openDatabase } from "./db";
import { dataLocation, isEmptyInstall } from "./settings";

describe("dataLocation", () => {
  it("names the data folder, or the database when Tailory runs on Postgres", () => {
    expect(dataLocation({ dataDir: "/home/me/.tailory" })).toEqual({
      kind: "folder",
      path: "/home/me/.tailory",
    });
    expect(
      dataLocation({ dataDir: "/home/me/.tailory", databaseUrl: "postgres://db/tailory" })
    ).toEqual({ kind: "database" });
  });
});

describe("isEmptyInstall", () => {
  let database: Database;
  let dataDir: string;
  let ctx: DataContext;

  beforeAll(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), "tailory-settings-"));
    database = await openDatabase({ dataDir, mode: "local" });
    ctx = { db: database.db, userId: LOCAL_USER.id, actor: { kind: "user" } };
  });

  afterAll(async () => {
    await database.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await eraseUserData(database.db, LOCAL_USER.id);
  });

  const named = (name: string) => {
    const resume = structuredClone(EMPTY_RESUME);
    resume.basics.name = name;
    return resume;
  };

  it("is true for a new install", async () => {
    expect(await isEmptyInstall(ctx)).toBe(true);
  });

  it("is false once the profile has something in it", async () => {
    await replaceProfile(ctx, named("Maya Fernandes"));
    expect(await isEmptyInstall(ctx)).toBe(false);
  });

  it("is true again when the profile is cleared back to nothing", async () => {
    await replaceProfile(ctx, named("Maya Fernandes"));
    await updateProfile(ctx, () => structuredClone(EMPTY_RESUME), "Cleared");
    expect(await isEmptyInstall(ctx)).toBe(true);
  });

  it("is false with an application, even with an empty profile", async () => {
    await createApplication(ctx, { company: "Northwind", role: "Engineer" });
    expect(await isEmptyInstall(ctx)).toBe(false);
  });

  it("is true after erasing everything", async () => {
    await replaceProfile(ctx, named("Maya Fernandes"));
    await createApplication(ctx, { company: "Northwind", role: "Engineer" });
    await eraseUserData(database.db, LOCAL_USER.id);
    expect(await isEmptyInstall(ctx)).toBe(true);
  });
});
