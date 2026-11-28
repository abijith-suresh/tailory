import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { groupByStatus } from "../lib/applications";
import {
  createApplication,
  type DataContext,
  getApplication,
  getProfile,
  listChanges,
  replaceProfile,
  updateApplication,
  updateProfile,
} from "./data";
import { type Database, openDatabase, schema } from "./db";
import {
  createApplicationFromForm,
  editApplication,
  getApplicationView,
  listApplicationRows,
  listPageResults,
  undoApplicationChange,
} from "./pages";

const profile = (): ResumeSchema => ({
  ...structuredClone(EMPTY_RESUME),
  basics: {
    ...structuredClone(EMPTY_RESUME).basics,
    name: "Ada Lovelace",
    label: "Engineer",
    summary: "Builds engines.",
  },
  work: [
    {
      id: "",
      name: "Acme",
      position: "Engineer",
      startDate: "2020",
      highlights: [
        { id: "", text: "Shipped the analytical engine" },
        { id: "", text: "Wrote the first program" },
      ],
    },
  ],
  skills: [{ id: "", name: "Mathematics", keywords: ["Analysis"] }],
});

describe("the Applications screens' server side", () => {
  let database: Database;
  let dataDir: string;
  let ada: DataContext;
  let bullets: { id: string; text: string }[];
  let workId: string;

  beforeAll(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), "tailory-pages-"));
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
    const saved = await replaceProfile(ada, profile());
    const work = saved.resume.work?.[0];
    workId = work?.id ?? "";
    bullets = work?.highlights ?? [];
  });

  const make = async (company: string, role: string) =>
    (await createApplication(ada, { company, role })).id;

  describe("the list", () => {
    it("hides archived applications unless asked, and searches company and role", async () => {
      const stripe = await make("Stripe", "Backend engineer");
      await make("Linear", "Product engineer");
      const old = await make("Initech", "Backend engineer");
      await updateApplication(ada, old, { archived: true });

      const names = (rows: { company: string }[]) => rows.map((row) => row.company).sort();
      expect(names(await listApplicationRows(ada))).toEqual(["Linear", "Stripe"]);
      expect(names(await listApplicationRows(ada, { showArchived: true }))).toEqual([
        "Initech",
        "Linear",
        "Stripe",
      ]);
      expect(names(await listApplicationRows(ada, { search: "backend" }))).toEqual(["Stripe"]);
      expect(
        names(await listApplicationRows(ada, { search: "BACKEND", showArchived: true }))
      ).toEqual(["Initech", "Stripe"]);
      expect(names(await listApplicationRows(ada, { search: "lin" }))).toEqual(["Linear"]);

      const [row] = await listApplicationRows(ada, { search: "stripe" });
      expect(row).toEqual({
        id: stripe,
        company: "Stripe",
        role: "Backend engineer",
        status: "drafting",
        outcome: null,
        offer: false,
        archived: false,
        statusChangedAt: expect.any(String),
        updatedAt: expect.any(String),
        pendingChanges: 0,
      });
    });

    it("groups by status, soonest-needed first, and drops empty groups", () => {
      const rows = [
        { id: "a", status: "drafting" as const },
        { id: "b", status: "closed" as const },
        { id: "c", status: "interviewing" as const },
        { id: "d", status: "drafting" as const },
      ];
      expect(
        groupByStatus(rows).map((group) => [group.status, group.items.map((row) => row.id)])
      ).toEqual([
        ["interviewing", ["c"]],
        ["drafting", ["a", "d"]],
        ["closed", ["b"]],
      ]);
    });

    it("gives each application its page result, and only the caller's", async () => {
      const id = await make("Stripe", "Engineer");
      const results = await listPageResults(ada, [id, "someone-elses"]);
      expect(Object.keys(results)).toEqual([id]);
      expect(results[id]).toMatchObject({ pagesNeeded: 1, fits: true, message: "1 page" });

      await updateApplication(ada, id, { pageTarget: 1 });
      expect((await listPageResults(ada, [id]))[id]?.message).toBe("1 page, fits");
    });
  });

  describe("the application", () => {
    it("is null for an id the user doesn't have", async () => {
      expect(await getApplicationView(ada, "nope")).toBeNull();
    });

    it("shows the printed PDF, the page result, the tree, and the changes", async () => {
      const id = await make("Stripe", "Engineer");
      const view = await getApplicationView(ada, id);
      expect(view?.page?.message).toBe("1 page");
      expect(
        Buffer.from(view?.pdf ?? "", "base64")
          .subarray(0, 5)
          .toString()
      ).toBe("%PDF-");
      expect(view?.sections.map((section) => section.label)).toEqual([
        "Summary",
        "Experience",
        "Skills",
      ]);
      expect(view?.sections[1]?.entries[0]).toMatchObject({
        id: workId,
        title: "Engineer, Acme",
        detail: "2020",
        included: true,
      });
      expect(view?.order.map((section) => section.key)).toEqual(["summary", "work", "skills"]);
      expect(view?.changes).toEqual([
        expect.objectContaining({
          who: "You",
          summary: "Created Stripe, Engineer",
          undoable: false,
        }),
      ]);
    });

    it("says why there is nothing to print", async () => {
      await replaceProfile(ada, structuredClone(EMPTY_RESUME));
      const view = await getApplicationView(ada, await make("Stripe", "Engineer"));
      expect(view?.pdf).toBeNull();
      expect(view?.page).toBeNull();
      expect(view?.printError).toBeTruthy();
    });
  });

  describe("edits", () => {
    it("creates an application from the form, and checks it", async () => {
      const bad = await createApplicationFromForm(ada, { company: " ", role: "Engineer" });
      expect(bad).toEqual({ ok: false, error: "Enter the company." });
      const badUrl = await createApplicationFromForm(ada, {
        company: "Stripe",
        role: "Engineer",
        postingUrl: "javascript:alert(1)",
      });
      expect(badUrl.ok).toBe(false);

      const made = await createApplicationFromForm(ada, {
        company: "Stripe",
        role: "Engineer",
        postingUrl: "https://stripe.com/jobs/1",
        jobDescription: "  Build payments.  ",
      });
      if (!made.ok) throw new Error(made.error);
      expect(await getApplication(ada, made.value.id)).toMatchObject({
        company: "Stripe",
        postingUrl: "https://stripe.com/jobs/1",
        jobDescription: "Build payments.",
        status: "drafting",
      });
    });

    it("leaves items out and puts them back, saving each with a summary", async () => {
      const id = await make("Stripe", "Engineer");
      const bullet = bullets[0]?.id ?? "";
      expect(
        await editApplication(ada, id, { type: "include", itemId: bullet, included: false })
      ).toEqual({ ok: true, value: undefined });
      expect((await getApplication(ada, id)).excluded).toEqual([bullet]);

      const view = await getApplicationView(ada, id);
      expect(view?.sections[1]?.entries[0]?.bullets.map((b) => b.included)).toEqual([false, true]);
      expect(view?.changes[0]?.summary).toBe("Left out “Shipped the analytical engine”");

      await editApplication(ada, id, { type: "include", itemId: workId, included: false });
      await editApplication(ada, id, { type: "include", itemId: bullet, included: true });
      expect((await getApplication(ada, id)).excluded).toEqual([workId]);
      expect((await listChanges(ada, { kind: "application", id }))[0]?.summary).toBe(
        "Put back “Shipped the analytical engine”"
      );
    });

    it("rewords a line, flags it when the profile moves on, and goes back to the profile", async () => {
      const id = await make("Stripe", "Engineer");
      const bullet = bullets[1]?.id ?? "";
      await editApplication(ada, id, {
        type: "reword",
        itemId: bullet,
        field: "text",
        text: "Wrote the first published algorithm",
      });
      let line = (await getApplicationView(ada, id))?.sections[1]?.entries[0]?.bullets[1];
      expect(line).toMatchObject({
        text: "Wrote the first published algorithm",
        profileText: "Wrote the first program",
        baseText: "Wrote the first program",
        stale: false,
      });

      await updateProfile(ada, (resume) => {
        const highlight = resume.work?.[0]?.highlights?.[1];
        if (highlight) highlight.text = "Wrote the first computer program";
        return resume;
      });
      const view = await getApplicationView(ada, id);
      line = view?.sections[1]?.entries[0]?.bullets[1];
      expect(line).toMatchObject({ stale: true, profileText: "Wrote the first computer program" });
      expect(view?.staleCount).toBe(1);

      // Typing the profile's words back drops the rewording.
      await editApplication(ada, id, {
        type: "reword",
        itemId: bullet,
        field: "text",
        text: "Wrote the first computer program ",
      });
      expect((await getApplication(ada, id)).rewordings).toEqual([]);
    });

    it("moves sections past empty ones, and sets the template and page target", async () => {
      const id = await make("Stripe", "Engineer");
      await editApplication(ada, id, { type: "move-section", section: "skills", direction: -1 });
      const view = await getApplicationView(ada, id);
      expect(view?.order.map((section) => section.key)).toEqual(["summary", "skills", "work"]);
      expect(view?.changes[0]?.summary).toBe("Moved Skills up");

      await editApplication(ada, id, { type: "template", templateId: "minimal" });
      await editApplication(ada, id, { type: "fit", pageTarget: 1, autoFit: false });
      const after = await getApplication(ada, id);
      expect(after).toMatchObject({ templateId: "minimal", pageTarget: 1, autoFit: false });
      const summaries = (await listChanges(ada, { kind: "application", id })).map(
        (change) => change.summary
      );
      expect(summaries.slice(0, 2)).toEqual([
        "Set the page target to 1 page; Turned tightening off",
        "Switched to the Minimal template",
      ]);

      expect(await editApplication(ada, id, { type: "template", templateId: "fancy" })).toEqual({
        ok: false,
        error: "That change isn't valid.",
      });
    });

    it("changes status, notes and archive", async () => {
      const id = await make("Stripe", "Engineer");
      await editApplication(ada, id, { type: "status", status: "applied" });
      await editApplication(ada, id, { type: "details", notes: "Recruiter: Sam", postingUrl: "" });
      await editApplication(ada, id, { type: "archive", archived: true });
      expect(await getApplication(ada, id)).toMatchObject({
        status: "applied",
        notes: "Recruiter: Sam",
        archived: true,
        appliedAt: expect.any(String),
      });
    });

    it("closes with an outcome, flags an offer, and refuses to close without one", async () => {
      const id = await make("Stripe", "Engineer");
      await editApplication(ada, id, { type: "status", status: "interviewing" });
      await editApplication(ada, id, { type: "status", offer: true });
      expect(await getApplication(ada, id)).toMatchObject({ status: "interviewing", offer: true });

      const refused = await editApplication(ada, id, { type: "status", status: "closed" });
      expect(refused).toEqual({ ok: false, error: expect.stringContaining("outcome") });

      await editApplication(ada, id, { type: "status", status: "closed", outcome: "accepted" });
      expect(await getApplication(ada, id)).toMatchObject({
        status: "closed",
        outcome: "accepted",
        offer: false,
        closedAt: expect.any(String),
      });
      expect((await listChanges(ada, { kind: "application", id }))[0]?.summary).toBe(
        "Moved Stripe, Engineer to closed (accepted)"
      );
    });

    it("leaves a contact detail out by its key", async () => {
      const id = await make("Stripe", "Engineer");
      await editApplication(ada, id, { type: "include", itemId: "contact:email", included: false });
      expect((await getApplication(ada, id)).excluded).toEqual(["contact:email"]);
    });
  });

  describe("undo", () => {
    it("puts the application back, and refuses clearly when a later change is in the way", async () => {
      const id = await make("Stripe", "Engineer");
      const bullet = bullets[0]?.id ?? "";
      await editApplication(ada, id, { type: "include", itemId: bullet, included: false });
      await editApplication(ada, id, { type: "status", status: "applied" });
      const [statusChange, leftOut] = await listChanges(ada, { kind: "application", id });

      expect(await undoApplicationChange(ada, id, leftOut?.id ?? "")).toEqual({
        ok: false,
        error: "Can't undo this: it was changed again since. Undo the later changes first.",
      });

      expect((await undoApplicationChange(ada, id, statusChange?.id ?? "")).ok).toBe(true);
      expect((await undoApplicationChange(ada, id, leftOut?.id ?? "")).ok).toBe(true);
      const after = await getApplication(ada, id);
      expect(after).toMatchObject({ status: "drafting", excluded: [] });
      expect((await getApplicationView(ada, id))?.changes[0]?.summary).toBe(
        "Undid: Left out “Shipped the analytical engine”"
      );
    });

    it("only undoes changes to this application", async () => {
      const id = await make("Stripe", "Engineer");
      const [profileChange] = await listChanges(ada, { kind: "profile" });
      expect(await undoApplicationChange(ada, id, profileChange?.id ?? "")).toEqual({
        ok: false,
        error: "That change is no longer in this application's log.",
      });
      expect((await getProfile(ada)).updatedAt).not.toBeNull();
    });
  });
});
