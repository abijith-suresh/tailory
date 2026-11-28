import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  eraseData,
  exportFile,
  keepAll,
  keepOne,
  pendingChangesView,
  undoAll,
  undoOne,
} from "./actions";
import {
  createApplication,
  type DataContext,
  getApplication,
  listChanges,
  replaceProfile,
  updateApplication,
} from "./data";
import { type Database, ensureLocalUser, LOCAL_USER, openDatabase, schema } from "./db";
import { createApplicationFromForm } from "./pages";

const profile = (): ResumeSchema => ({
  ...structuredClone(EMPTY_RESUME),
  basics: { ...structuredClone(EMPTY_RESUME).basics, name: "Ada Lovelace" },
  work: [
    {
      id: "",
      name: "Acme",
      position: "Engineer",
      highlights: [
        { id: "", text: "Shipped the analytical engine" },
        { id: "", text: "Wrote the first program" },
      ],
    },
  ],
  sectionOrder: ["work", "summary"],
});

describe("the web app's review, export and erase actions", () => {
  let database: Database;
  let dataDir: string;
  let ada: DataContext;
  let agent: DataContext;
  let bullets: string[];

  beforeAll(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), "tailory-actions-"));
    database = await openDatabase({ dataDir, mode: "local" });
  });

  afterAll(async () => {
    await database.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const { db } = database;
    await db.delete(schema.user).where(sql`${schema.user.id} = 'ada'`);
    await db.insert(schema.user).values({ id: "ada", name: "Ada", email: "ada@example.com" });
    ada = { db, userId: "ada", actor: { kind: "user" } };
    agent = { ...ada, actor: { kind: "agent", client: "claude-code" } };
    const saved = await replaceProfile(ada, profile());
    bullets = (saved.resume.work?.[0]?.highlights ?? []).map((bullet) => bullet.id);
  });

  it("creates an application from the dialog, in the profile's section order", async () => {
    const created = await createApplicationFromForm(ada, {
      company: "Stripe",
      role: "Engineer",
      postingUrl: "https://stripe.example/jobs/1",
      jobDescription: "Payments.",
    });
    if (!created.ok) throw new Error(created.error);
    expect(await getApplication(ada, created.value.id)).toMatchObject({
      company: "Stripe",
      postingUrl: "https://stripe.example/jobs/1",
      jobDescription: "Payments.",
      excluded: [],
      sectionOrder: expect.arrayContaining(["work", "summary"]),
    });
    expect((await getApplication(ada, created.value.id)).sectionOrder.slice(0, 2)).toEqual([
      "work",
      "summary",
    ]);
  });

  it("keeps or undoes the agent's changes, one or all", async () => {
    const { id } = await createApplication(ada, { company: "Stripe", role: "Engineer" });
    await updateApplication(agent, id, { excluded: [bullets[0] as string] });
    await updateApplication(agent, id, { excluded: bullets });
    const [newer, older] = (await pendingChangesView(ada, id)) ?? [];

    expect(await keepOne(ada, older?.id ?? "")).toEqual({ ok: true, value: undefined });
    // The older change can't be undone with the newer one on top of it.
    expect(await undoOne(ada, older?.id ?? "")).toEqual({
      ok: false,
      error: expect.stringContaining("changed again since"),
    });
    expect(await undoOne(ada, newer?.id ?? "")).toEqual({ ok: true, value: undefined });
    expect(await keepOne(ada, newer?.id ?? "")).toEqual({
      ok: false,
      error: "This change was undone already.",
    });

    await updateApplication(agent, id, { notes: "One" });
    await updateApplication(agent, id, { notes: "Two" });
    expect(await undoAll(ada, id)).toEqual({ ok: true, value: { count: 2 } });
    expect((await getApplication(ada, id)).notes).toBe("");
    await updateApplication(agent, id, { notes: "Three" });
    expect(await keepAll(ada, id)).toEqual({ ok: true, value: { count: 1 } });
    expect(await pendingChangesView(ada, id)).toEqual([]);
    expect(await pendingChangesView(ada, "someone-elses")).toBeNull();
    expect(await keepOne(ada, "no-such-change")).toEqual({
      ok: false,
      error: "That change is gone.",
    });
  });

  it("exports everything as one dated JSON file", async () => {
    await createApplication(ada, { company: "Stripe", role: "Engineer" });
    const file = await exportFile(ada, new Date("2026-11-28T09:30:00.000Z"));
    expect(file.fileName).toBe("tailory-export-2026-11-28.json");
    expect(file.data.profile.resume.basics.name).toBe("Ada Lovelace");
    expect(file.data.applications).toHaveLength(1);
  });

  it("erases the local user's data and keeps the user", async () => {
    await ensureLocalUser(database.db);
    const local: DataContext = { db: database.db, userId: LOCAL_USER.id, actor: { kind: "user" } };
    await replaceProfile(local, profile());
    await createApplication(local, { company: "Stripe", role: "Engineer" });

    expect(await eraseData(local, "local")).toEqual({
      erased: true,
      applications: 1,
      accountDeleted: false,
    });
    expect(await listChanges(local)).toEqual([]);
    const [user] = await database.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, LOCAL_USER.id));
    expect(user?.id).toBe(LOCAL_USER.id);
  });

  it("deletes the account in server mode", async () => {
    await createApplication(ada, { company: "Stripe", role: "Engineer" });
    expect(await eraseData(ada, "server")).toMatchObject({ erased: true, accountDeleted: true });
    const users = await database.db.select().from(schema.user).where(eq(schema.user.id, "ada"));
    expect(users).toEqual([]);
  });
});
