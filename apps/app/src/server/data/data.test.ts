import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deleteUser } from "../account";
import { type Database, LOCAL_USER, openDatabase, schema } from "../db";
import {
  type Actor,
  createApplication,
  type DataContext,
  deleteApplication,
  getApplication,
  getProfile,
  listApplications,
  listChanges,
  replaceProfile,
  undoChange,
  updateApplication,
  updateProfile,
} from ".";

// Runs on PGlite always, and on Postgres too when TAILORY_TEST_DATABASE_URL is set (CI's
// app-postgres job). The Postgres run drops and recreates the public schema.
const postgresUrl = process.env.TAILORY_TEST_DATABASE_URL;

const drivers: {
  name: string;
  open: () => Promise<{ database: Database; cleanup: () => void }>;
}[] = [
  {
    name: "PGlite",
    open: async () => {
      const dataDir = mkdtempSync(path.join(tmpdir(), "tailory-data-"));
      const database = await openDatabase({ dataDir, mode: "local" });
      return { database, cleanup: () => rmSync(dataDir, { recursive: true, force: true }) };
    },
  },
];
if (postgresUrl) {
  drivers.push({
    name: "Postgres",
    open: async () => {
      const client = postgres(postgresUrl, { max: 1, onnotice: () => {} });
      await client`drop schema if exists drizzle cascade`;
      await client`drop schema public cascade`;
      await client`create schema public`;
      await client.end();
      const database = await openDatabase({
        dataDir: "/unused",
        databaseUrl: postgresUrl,
        mode: "local",
      });
      return { database, cleanup: () => {} };
    },
  });
}

const user: Actor = { kind: "user" };
const agent: Actor = { kind: "agent", client: "claude-code" };

const resume = (name: string, bullets: string[] = []): ResumeSchema => ({
  ...structuredClone(EMPTY_RESUME),
  basics: { ...structuredClone(EMPTY_RESUME).basics, name },
  work: [
    {
      id: "",
      name: "Acme",
      position: "Engineer",
      highlights: bullets.map((text) => ({ id: "", text })),
    },
  ],
});

describe.each(drivers)("the data layer on $name", ({ open }) => {
  let database: Database;
  let cleanup: () => void;
  let alice: DataContext;
  let bob: DataContext;

  beforeAll(async () => {
    ({ database, cleanup } = await open());
  });

  afterAll(async () => {
    await database.close();
    cleanup();
  });

  beforeEach(async () => {
    const { db } = database;
    await db.delete(schema.user).where(sql`${schema.user.id} in ('alice', 'bob')`);
    await deleteUser(db, LOCAL_USER.id);
    await db.insert(schema.user).values([
      { id: "alice", name: "Alice", email: "alice@example.com" },
      { id: "bob", name: "Bob", email: "bob@example.com" },
    ]);
    alice = { db, userId: "alice", actor: user };
    bob = { db, userId: "bob", actor: user };
  });

  describe("the profile", () => {
    it("is empty before the first write", async () => {
      const profile = await getProfile(alice);
      expect(profile.updatedAt).toBeNull();
      expect(profile.resume.basics.name).toBe("");
      expect(profile.resume.work).toEqual([]);
      expect(await listChanges(alice)).toEqual([]);
    });

    it("normalizes what it stores and logs the change with its actor", async () => {
      const saved = await replaceProfile(
        { ...alice, actor: agent },
        resume("  Alice  ", ["Built it"])
      );
      expect(saved.resume.basics.name).toBe("Alice");
      const bullet = saved.resume.work?.[0]?.highlights?.[0];
      expect(bullet?.id).toMatch(/^[0-9a-f-]{36}$/);

      expect(await getProfile(alice)).toEqual(saved);
      const [change] = await listChanges(alice, { kind: "profile" });
      expect(change).toMatchObject({
        target: { kind: "profile" },
        actor: { kind: "agent", client: "claude-code" },
        summary: "Replaced the profile",
        before: null,
        undoes: null,
      });
      expect(change?.after).toEqual(saved.resume);
    });

    it("stores the resume as a jsonb object", async () => {
      await replaceProfile(alice, resume("Alice"));
      const result: unknown = await database.db.execute(
        sql`select jsonb_typeof(resume) as type from profile where user_id = 'alice'`
      );
      const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
      expect(rows).toEqual([{ type: "object" }]);
    });

    it("changes through an update function, and logs nothing when nothing changes", async () => {
      await replaceProfile(alice, resume("Alice"));
      const updated = await updateProfile(
        alice,
        (current) => ({ ...current, basics: { ...current.basics, label: "Engineer" } }),
        "Set the headline"
      );
      expect(updated.resume.basics.label).toBe("Engineer");
      await updateProfile(alice, (current) => current);
      expect((await listChanges(alice)).map((change) => change.summary)).toEqual([
        "Set the headline",
        "Replaced the profile",
      ]);
    });

    it("writes and logs nothing when the update throws", async () => {
      await expect(
        updateProfile(alice, () => {
          throw new Error("no");
        })
      ).rejects.toThrow("no");
      expect((await getProfile(alice)).updatedAt).toBeNull();
      expect(await listChanges(alice)).toEqual([]);
    });

    it("undoes back to the earlier profile, then to none", async () => {
      await replaceProfile(alice, resume("Alice"));
      await replaceProfile(alice, resume("Alice Smith"));
      const [second, first] = await listChanges(alice);

      const undo = await undoChange(alice, second?.id as string);
      expect(undo).toMatchObject({ undoes: second?.id, summary: "Undid: Replaced the profile" });
      expect((await getProfile(alice)).resume.basics.name).toBe("Alice");

      await undoChange(alice, first?.id as string);
      expect(await getProfile(alice)).toMatchObject({ updatedAt: null });
      expect((await getProfile(alice)).resume.basics.name).toBe("");
    });
  });

  describe("applications", () => {
    it("creates one drafting, and logs it", async () => {
      const created = await createApplication(
        { ...alice, actor: agent },
        { company: " Stripe ", role: "Engineer", jobDescription: "Build payments" }
      );
      expect(created).toMatchObject({
        company: "Stripe",
        role: "Engineer",
        status: "drafting",
        archived: false,
        jobDescription: "Build payments",
      });
      expect(await getApplication(alice, created.id)).toEqual(created);
      const [change] = await listChanges(alice, { kind: "application", id: created.id });
      expect(change).toMatchObject({
        summary: "Created Stripe, Engineer",
        actor: { kind: "agent", client: "claude-code" },
        before: null,
      });
    });

    it("lists by status, archived, and text in the company or role", async () => {
      const stripe = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      const linear = await createApplication(alice, { company: "Linear", role: "Designer" });
      const odd = await createApplication(alice, { company: "100% Co", role: "Ops_Lead" });
      await updateApplication(alice, linear.id, { status: "applied" });
      await updateApplication(alice, odd.id, { archived: true });

      const ids = async (filter: Parameters<typeof listApplications>[1]) =>
        (await listApplications(alice, filter)).map((application) => application.id).sort();

      expect(await ids({})).toEqual([stripe.id, linear.id, odd.id].sort());
      expect(await ids({ status: "applied" })).toEqual([linear.id]);
      expect(await ids({ status: ["drafting", "applied"], archived: false })).toEqual(
        [stripe.id, linear.id].sort()
      );
      expect(await ids({ status: [] })).toEqual([]);
      expect(await ids({ archived: true })).toEqual([odd.id]);
      expect(await ids({ search: "strip" })).toEqual([stripe.id]);
      expect(await ids({ search: "DESIGN" })).toEqual([linear.id]);
      expect(await ids({ search: "%" })).toEqual([odd.id]);
      expect(await ids({ search: "o_s" })).toEqual([]);
      expect(await ids({ search: "s%l" })).toEqual([]);
      expect(await ids({ search: "s_lead" })).toEqual([odd.id]);
      expect((await listApplications(alice))[0]?.id).toBe(odd.id);
    });

    it("moves the status and keeps the dates in step", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      const applied = await updateApplication(alice, created.id, { status: "applied" });
      expect(applied.appliedAt).not.toBeNull();
      expect(applied.closedAt).toBeNull();
      const rejected = await updateApplication(alice, created.id, { status: "rejected" });
      expect(rejected.appliedAt).toBe(applied.appliedAt);
      expect(rejected.closedAt).not.toBeNull();
      expect((await listChanges(alice)).slice(0, 2).map((change) => change.summary)).toEqual([
        "Moved Stripe, Engineer to rejected",
        "Moved Stripe, Engineer to applied",
      ]);
    });

    it("changes job fields, notes, archive and tailoring, normalized against the profile", async () => {
      const profile = await replaceProfile(alice, resume("Alice", ["Built it"]));
      const bulletId = profile.resume.work?.[0]?.highlights?.[0]?.id as string;
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });

      const updated = await updateApplication(alice, created.id, {
        role: "Staff Engineer",
        notes: "Recruiter: Sam",
        excluded: [bulletId, "not-in-profile"],
        rewordings: [{ itemId: bulletId, field: "text", text: "Built it fast", baseText: "" }],
        pageTarget: 1,
        templateId: "minimal",
      });
      expect(updated).toMatchObject({
        id: created.id,
        createdAt: created.createdAt,
        role: "Staff Engineer",
        notes: "Recruiter: Sam",
        excluded: [bulletId],
        pageTarget: 1,
        templateId: "minimal",
      });
      expect(updated.rewordings).toHaveLength(1);
      expect((await listChanges(alice))[0]?.summary).toBe(
        "Changed the role, notes, left-out items, wording, template, page target of Stripe, Staff Engineer"
      );

      await updateApplication(alice, created.id, { archived: true });
      expect((await listChanges(alice))[0]?.summary).toBe("Archived Stripe, Staff Engineer");
    });

    it("logs nothing for an update that changes nothing", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await updateApplication(alice, created.id, { company: "Stripe", status: "drafting" });
      expect(await listChanges(alice)).toHaveLength(1);
    });

    it("deletes one, and undoing the delete brings it back", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await deleteApplication(alice, created.id);
      await expect(getApplication(alice, created.id)).rejects.toMatchObject({
        code: "not_found",
      });
      const [deleted] = await listChanges(alice, { kind: "application", id: created.id });
      expect(deleted).toMatchObject({ summary: "Deleted Stripe, Engineer", after: null });

      await undoChange(alice, deleted?.id as string);
      expect(await getApplication(alice, created.id)).toMatchObject({
        id: created.id,
        company: "Stripe",
        createdAt: created.createdAt,
      });
    });

    it("undoes an update, undoes the undo, and undoes a create", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await updateApplication(alice, created.id, { notes: "First call went well" });
      const [update, create] = await listChanges(alice);

      const undo = await undoChange({ ...alice, actor: agent }, update?.id as string);
      expect(undo.actor).toEqual({ kind: "agent", client: "claude-code" });
      expect((await getApplication(alice, created.id)).notes).toBe("");

      await undoChange(alice, undo.id);
      expect((await getApplication(alice, created.id)).notes).toBe("First call went well");

      // The create can't be undone while later changes are in place.
      await expect(undoChange(alice, create?.id as string)).rejects.toMatchObject({
        code: "conflict",
      });
      await updateApplication(alice, created.id, { notes: "" });
      await undoChange(alice, create?.id as string);
      expect(await listApplications(alice)).toEqual([]);
    });

    it("refuses to undo a change something later changed again", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await updateApplication(alice, created.id, { notes: "One" });
      const [first] = await listChanges(alice);
      await updateApplication(alice, created.id, { notes: "Two" });
      await expect(undoChange(alice, first?.id as string)).rejects.toMatchObject({
        code: "conflict",
      });
      expect((await getApplication(alice, created.id)).notes).toBe("Two");
    });
  });

  describe("between users", () => {
    it("never reads or writes another user's rows", async () => {
      await replaceProfile(alice, resume("Alice"));
      const theirs = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      const [change] = await listChanges(alice);

      expect((await getProfile(bob)).updatedAt).toBeNull();
      expect(await listApplications(bob)).toEqual([]);
      expect(await listChanges(bob)).toEqual([]);
      expect(await listChanges(bob, { kind: "application", id: theirs.id })).toEqual([]);

      const notFound = { code: "not_found" };
      await expect(getApplication(bob, theirs.id)).rejects.toMatchObject(notFound);
      await expect(updateApplication(bob, theirs.id, { notes: "x" })).rejects.toMatchObject(
        notFound
      );
      await expect(deleteApplication(bob, theirs.id)).rejects.toMatchObject(notFound);
      await expect(undoChange(bob, change?.id as string)).rejects.toMatchObject(notFound);

      expect(await getApplication(alice, theirs.id)).toEqual(theirs);
      expect(await listChanges(alice)).toHaveLength(2);
    });

    it("keeps each user's profile apart", async () => {
      await replaceProfile(alice, resume("Alice"));
      await replaceProfile(bob, resume("Bob"));
      const [bobChange] = await listChanges(bob);
      await undoChange(bob, bobChange?.id as string);
      expect((await getProfile(alice)).resume.basics.name).toBe("Alice");
      expect((await getProfile(bob)).updatedAt).toBeNull();
    });
  });

  it("works for local mode's user, and deleting the account removes everything", async () => {
    const local: DataContext = { db: database.db, userId: LOCAL_USER.id, actor: user };
    await replaceProfile(local, resume("You"));
    await createApplication(local, { company: "Stripe", role: "Engineer" });
    await createApplication(alice, { company: "Linear", role: "Designer" });

    await deleteUser(database.db, LOCAL_USER.id);

    expect((await getProfile(local)).updatedAt).toBeNull();
    expect(await listApplications(local)).toEqual([]);
    expect(await listChanges(local)).toEqual([]);
    expect(await listApplications(alice)).toHaveLength(1);

    await deleteUser(database.db, "alice");
    const rows = await Promise.all([
      database.db.select().from(schema.profile),
      database.db.select().from(schema.application),
      database.db.select().from(schema.change),
    ]);
    expect(rows).toEqual([[], [], []]);
  });
});
