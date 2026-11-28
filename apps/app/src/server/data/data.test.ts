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
  countPendingChanges,
  createApplication,
  type DataContext,
  deleteApplication,
  eraseUserData,
  exportEverything,
  getApplication,
  getLastToolCall,
  getProfile,
  keepAllChanges,
  keepChange,
  listApplications,
  listChanges,
  listPendingChanges,
  recordToolCall,
  replaceProfile,
  undoAllChanges,
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
      expect(applied.statusChangedAt > created.statusChangedAt).toBe(true);
      const rejected = await updateApplication(alice, created.id, {
        status: "closed",
        outcome: "rejected",
      });
      expect(rejected).toMatchObject({ status: "closed", outcome: "rejected", offer: false });
      expect(rejected.appliedAt).toBe(applied.appliedAt);
      expect(rejected.closedAt).not.toBeNull();
      expect((await listChanges(alice)).slice(0, 2).map((change) => change.summary)).toEqual([
        "Moved Stripe, Engineer to closed (rejected)",
        "Moved Stripe, Engineer to applied",
      ]);
      const reopened = await updateApplication(alice, created.id, { status: "interviewing" });
      expect(reopened).toMatchObject({ outcome: null, closedAt: null });
    });

    it("refuses to close without an outcome, and changes nothing", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await expect(
        updateApplication(alice, created.id, { status: "closed" })
      ).rejects.toMatchObject({ code: "invalid", message: expect.stringContaining("outcome") });
      expect((await getApplication(alice, created.id)).status).toBe("drafting");
      expect(await listChanges(alice)).toHaveLength(1);
    });

    it("flags an offer without moving the status", async () => {
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      const interviewing = await updateApplication(alice, created.id, { status: "interviewing" });
      const offer = await updateApplication(alice, created.id, { offer: true });
      expect(offer).toMatchObject({ status: "interviewing", offer: true });
      expect(offer.statusChangedAt).toBe(interviewing.statusChangedAt);
      expect((await listChanges(alice))[0]?.summary).toBe("Marked an offer from Stripe, Engineer");
      const declined = await updateApplication(alice, created.id, {
        status: "closed",
        outcome: "declined",
      });
      expect(declined).toMatchObject({ offer: false, outcome: "declined" });
    });

    it("starts from the profile's section order, and keeps its own after", async () => {
      await replaceProfile(alice, {
        ...resume("Alice"),
        sectionOrder: ["skills", "education", "work"],
      });
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      expect(created.sectionOrder.slice(0, 3)).toEqual(["skills", "education", "work"]);

      await updateProfile(alice, (current) => ({ ...current, sectionOrder: ["work"] }));
      expect((await getApplication(alice, created.id)).sectionOrder[0]).toBe("skills");
      const later = await createApplication(alice, { company: "Linear", role: "Engineer" });
      expect(later.sectionOrder[0]).toBe("work");
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

  describe("the profile model", () => {
    it("names links by their site and gives each an id", async () => {
      const saved = await replaceProfile(alice, {
        ...resume("Alice"),
        basics: {
          ...resume("Alice").basics,
          profiles: [
            { id: "", network: "", username: "", url: "https://gitlab.com/alice" },
            { id: "", network: "", username: "", url: "https://alice.example" },
          ],
        },
      });
      expect(saved.resume.basics.profiles).toEqual([
        {
          id: expect.any(String),
          network: "GitLab",
          username: "alice",
          url: "https://gitlab.com/alice",
        },
        { id: expect.any(String), network: "Website", username: "", url: "https://alice.example" },
      ]);
      const ids = saved.resume.basics.profiles?.map((link) => link.id);
      // Saving again keeps the ids, so an application's left-out link stays left out.
      const again = await updateProfile(alice, (current) => ({
        ...current,
        basics: { ...current.basics, label: "Engineer" },
      }));
      expect(again.resume.basics.profiles?.map((link) => link.id)).toEqual(ids);
    });

    it("keeps volunteering, awards, certificates and languages", async () => {
      const saved = await replaceProfile(alice, {
        ...resume("Alice"),
        volunteer: [
          {
            id: "",
            organization: "Code Club",
            position: "Mentor",
            startDate: "2019-01",
            highlights: [{ id: "", text: "Taught Python" }],
          },
        ],
        awards: [{ id: "", title: "Engineer of the Year", date: "2016-12", awarder: "Acme" }],
        certificates: [{ id: "", name: "AWS SA", issuer: "Amazon", date: "2020-03" }],
        languages: [{ id: "", language: "French", fluency: "Professional" }],
      });
      const { resume: stored } = await getProfile(alice);
      expect(stored).toEqual(saved.resume);
      expect(stored.volunteer?.[0]?.highlights?.[0]?.id).toMatch(/\S/);
      expect(stored.awards?.[0]).toMatchObject({ title: "Engineer of the Year", awarder: "Acme" });
      expect(stored.certificates?.[0]).toMatchObject({ name: "AWS SA", issuer: "Amazon" });
      expect(stored.languages?.[0]).toMatchObject({ language: "French", fluency: "Professional" });

      // An application can leave each of them out.
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      const ids = [
        stored.volunteer?.[0]?.highlights?.[0]?.id,
        stored.awards?.[0]?.id,
        stored.certificates?.[0]?.id,
        stored.languages?.[0]?.id,
      ] as string[];
      const updated = await updateApplication(alice, created.id, { excluded: ids });
      expect(updated.excluded).toEqual(ids);
    });

    it("keeps its section order when an import replaces it", async () => {
      await replaceProfile(alice, { ...resume("Alice"), sectionOrder: ["skills"] });
      const imported = await replaceProfile(alice, resume("Alice Smith"));
      expect(imported.resume.sectionOrder?.[0]).toBe("skills");
    });
  });

  describe("reviewing the agent's changes", () => {
    const asAgent = () => ({ ...alice, actor: agent });

    /** A profile with one job of three bullets, and an application for it. */
    const setUp = async () => {
      const saved = await replaceProfile(alice, resume("Alice", ["One", "Two", "Three"]));
      const job = saved.resume.work?.[0];
      const [b1, b2, b3] = (job?.highlights ?? []).map((bullet) => bullet.id);
      const created = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      return { id: created.id, jobId: job?.id as string, b1, b2, b3 } as {
        id: string;
        jobId: string;
        b1: string;
        b2: string;
        b3: string;
      };
    };

    it("keeps the user's own changes at once, and holds the agent's", async () => {
      const { id } = await setUp();
      await updateApplication(asAgent(), id, { notes: "From the agent" });
      const [byAgent, byUser] = await listChanges(alice, { kind: "application", id });
      expect(byUser).toMatchObject({
        review: "kept",
        reviewer: { kind: "user" },
        reviewedAt: byUser?.createdAt,
      });
      expect(byAgent).toMatchObject({ review: "pending", reviewer: null, reviewedAt: null });
      expect(await listChanges(alice, undefined, { review: "pending" })).toHaveLength(1);
    });

    it("draws each pending change on the page: reworded lines and left-out items", async () => {
      const { id, jobId, b1, b2 } = await setUp();
      await updateApplication(asAgent(), id, {
        excluded: [b2, "contact:phone"],
        rewordings: [{ itemId: b1, field: "text", text: "Uno", baseText: "One" }],
      });
      await updateApplication(asAgent(), id, { excluded: [b2, "contact:phone", b1] });

      const [second, first] = await listPendingChanges(alice, id);
      expect(first).toMatchObject({
        client: "claude-code",
        created: false,
        reworded: [{ itemId: b1, field: "text", oldText: "One", newText: "Uno" }],
        leftOut: [
          { id: b2, section: "work", afterId: b1 },
          { id: "contact:phone", section: "basics", afterId: "contact:email" },
        ],
        putBack: [],
      });
      // The first bullet sits right after its entry.
      expect(second?.leftOut).toEqual([{ id: b1, section: "work", afterId: jobId }]);
      expect(await countPendingChanges(alice)).toEqual({ [id]: 2 });
    });

    it("keeps one change, then all of them", async () => {
      const { id, b1, b2 } = await setUp();
      await updateApplication(asAgent(), id, { excluded: [b1] });
      await updateApplication(asAgent(), id, { excluded: [b1, b2] });
      const [newer, older] = await listPendingChanges(alice, id);

      const kept = await keepChange(alice, older?.id as string);
      expect(kept).toMatchObject({ review: "kept", reviewer: { kind: "user" } });
      expect(kept.reviewedAt).toEqual(expect.any(String));
      expect((await listPendingChanges(alice, id)).map((change) => change.id)).toEqual([newer?.id]);
      // Keeping a kept change does nothing.
      expect((await keepChange(alice, older?.id as string)).reviewedAt).toBe(kept.reviewedAt);

      expect(await keepAllChanges(alice, { kind: "application", id })).toBe(1);
      expect(await listPendingChanges(alice, id)).toEqual([]);
      expect((await getApplication(alice, id)).excluded).toEqual([b1, b2]);
    });

    it("undoes one change and marks it undone; an undone change can't be kept", async () => {
      const { id, b1 } = await setUp();
      await updateApplication(asAgent(), id, { excluded: [b1] });
      const [pending] = await listPendingChanges(alice, id);

      const undo = await undoChange(alice, pending?.id as string);
      expect(undo).toMatchObject({ undoes: pending?.id, review: "kept" });
      expect((await getApplication(alice, id)).excluded).toEqual([]);
      const [, original] = await listChanges(alice, { kind: "application", id });
      expect(original).toMatchObject({ review: "undone", reviewer: { kind: "user" } });
      await expect(keepChange(alice, pending?.id as string)).rejects.toMatchObject({
        code: "conflict",
      });
    });

    it("undoes all pending changes newest first, or none when one is in the way", async () => {
      const { id, b1, b2 } = await setUp();
      await updateApplication(asAgent(), id, { excluded: [b1] });
      await updateApplication(asAgent(), id, { excluded: [b1, b2] });
      const undone = await undoAllChanges(alice, { kind: "application", id });
      expect(undone.map((change) => change.summary)).toEqual([
        expect.stringMatching(/^Undid: /),
        expect.stringMatching(/^Undid: /),
      ]);
      expect((await getApplication(alice, id)).excluded).toEqual([]);
      expect(await listPendingChanges(alice, id)).toEqual([]);

      // The user's own edit after the agent's is in the way: nothing is undone.
      await updateApplication(asAgent(), id, { excluded: [b1] });
      await updateApplication(alice, id, { notes: "Mine" });
      await expect(undoAllChanges(alice, { kind: "application", id })).rejects.toMatchObject({
        code: "conflict",
      });
      expect(await getApplication(alice, id)).toMatchObject({ excluded: [b1], notes: "Mine" });
      expect(await listPendingChanges(alice, id)).toHaveLength(1);
    });

    it("counts the user's edit of every line a change touched as reviewing it", async () => {
      const { id, b1, b2 } = await setUp();
      await updateApplication(asAgent(), id, {
        excluded: [b2],
        rewordings: [{ itemId: b1, field: "text", text: "Uno", baseText: "One" }],
      });
      await updateApplication(asAgent(), id, { notes: "Agent notes" });

      // Rewording one of the lines again: the change still shows the other.
      await updateApplication(alice, id, {
        rewordings: [{ itemId: b1, field: "text", text: "Mine", baseText: "One" }],
      });
      const [, partly] = await listPendingChanges(alice, id);
      expect(partly).toMatchObject({ reworded: [], leftOut: [{ id: b2 }] });

      // Putting the left-out line back too: the change is reviewed. The notes change is not.
      await updateApplication(alice, id, { excluded: [] });
      const pending = await listPendingChanges(alice, id);
      expect(pending.map((change) => change.summary)).toEqual([
        "Changed the notes of Stripe, Engineer",
      ]);
      const reviewed = (await listChanges(alice, { kind: "application", id })).find(
        (change) => change.id === partly?.id
      );
      expect(reviewed).toMatchObject({ review: "kept", reviewer: { kind: "user" } });
    });

    it("lists an agent's new application as created", async () => {
      const created = await createApplication(asAgent(), { company: "Stripe", role: "Engineer" });
      expect(await listPendingChanges(alice, created.id)).toEqual([
        expect.objectContaining({ created: true, reworded: [], leftOut: [] }),
      ]);
      await expect(listPendingChanges(bob, created.id)).rejects.toMatchObject({
        code: "not_found",
      });
    });
  });

  describe("the agent's last call", () => {
    it("is none until a call, then the latest one", async () => {
      expect(await getLastToolCall(alice)).toBeNull();
      await recordToolCall(alice, { client: "claude-code", tool: "get_profile" });
      await recordToolCall(
        alice,
        { client: "codex", tool: "tailor_application" },
        new Date("2026-11-28T12:00:00.000Z")
      );
      expect(await getLastToolCall(alice)).toEqual({
        client: "codex",
        tool: "tailor_application",
        calledAt: "2026-11-28T12:00:00.000Z",
      });
      expect(await getLastToolCall(bob)).toBeNull();
    });
  });

  describe("export and erase", () => {
    it("exports the profile and every application, archived ones too", async () => {
      await replaceProfile(alice, resume("Alice"));
      const one = await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await updateApplication(alice, one.id, { archived: true });
      await createApplication(alice, { company: "Linear", role: "Designer" });
      await createApplication(bob, { company: "Elsewhere", role: "Other" });

      const exported = await exportEverything(alice, new Date("2026-11-28T00:00:00.000Z"));
      expect(exported).toMatchObject({
        format: "tailory-export",
        version: 1,
        exportedAt: "2026-11-28T00:00:00.000Z",
        profile: { resume: { basics: { name: "Alice" } } },
      });
      expect(exported.applications.map((application) => application.company).sort()).toEqual([
        "Linear",
        "Stripe",
      ]);
      expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);
    });

    it("erases one user's rows and leaves the user and everyone else", async () => {
      await replaceProfile(alice, resume("Alice"));
      await createApplication(alice, { company: "Stripe", role: "Engineer" });
      await recordToolCall(alice, { client: null, tool: "get_profile" });
      await createApplication(bob, { company: "Linear", role: "Designer" });

      expect(await eraseUserData(database.db, "alice")).toEqual({ applications: 1 });
      expect((await getProfile(alice)).updatedAt).toBeNull();
      expect(await listApplications(alice)).toEqual([]);
      expect(await listChanges(alice)).toEqual([]);
      expect(await getLastToolCall(alice)).toBeNull();
      const users = await database.db.select({ id: schema.user.id }).from(schema.user);
      expect(users.map((row) => row.id)).toContain("alice");
      expect(await listApplications(bob)).toHaveLength(1);
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
