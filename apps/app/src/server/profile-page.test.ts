import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { deleteUser } from "./account";
import { type DataContext, getProfile, listChanges, replaceProfile } from "./data";
import { type Database, openDatabase, schema } from "./db";
import {
  describeProfileEdit,
  importProfile,
  loadProfile,
  MAX_PROFILE_BYTES,
  type SaveResult,
  saveProfile,
  toResumeInput,
  undoProfileChange,
} from "./profile-page";

const resume = (name: string, bullets: string[] = []): ResumeSchema => ({
  ...structuredClone(EMPTY_RESUME),
  basics: { ...structuredClone(EMPTY_RESUME).basics, name },
  work: [
    {
      id: "job-1",
      name: "Acme",
      position: "Engineer",
      highlights: bullets.map((text, index) => ({ id: `b${index}`, text })),
    },
  ],
});

/** A copy as the browser sends it: plain JSON. */
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ok = (result: SaveResult) => {
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}: ${result.message}`);
  return result;
};

describe("the Profile page's server side", () => {
  let database: Database;
  let dataDir: string;
  let you: DataContext;
  let agent: DataContext;

  beforeAll(async () => {
    dataDir = mkdtempSync(path.join(tmpdir(), "tailory-profile-"));
    database = await openDatabase({ dataDir, mode: "local" });
  });

  afterAll(async () => {
    await database.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const { db } = database;
    await deleteUser(db, "ada");
    await db.insert(schema.user).values({ id: "ada", name: "Ada", email: "ada@example.com" });
    you = { db, userId: "ada", actor: { kind: "user" } };
    agent = { db, userId: "ada", actor: { kind: "agent", client: "Claude Code" } };
  });

  describe("saving edits", () => {
    it("saves an edit and logs it as one change by you, naming what changed", async () => {
      const start = await loadProfile(you);
      const saved = ok(await saveProfile(you, json(start.resume), json(resume("Ada", ["Built"]))));

      expect(saved.resume.basics.name).toBe("Ada");
      expect(saved.resume.work?.[0]?.highlights).toEqual([{ id: "b0", text: "Built" }]);
      expect((await getProfile(you)).resume).toEqual(saved.resume);
      expect(saved.changes).toHaveLength(1);
      expect(saved.changes[0]).toMatchObject({
        summary: "Edited the basics and work",
        by: "You",
        byAgent: false,
        isUndo: false,
        undoable: true,
      });
    });

    it("logs each save separately, and only the newest can be undone", async () => {
      let base = (await loadProfile(you)).resume;
      base = ok(await saveProfile(you, json(base), json(resume("Ada")))).resume;
      const next = json(base);
      next.work?.[0]?.highlights?.push({ id: "new", text: "Shipped" });
      const saved = ok(await saveProfile(you, json(base), next));

      expect(saved.changes.map((change) => [change.summary, change.undoable])).toEqual([
        ["Edited work", true],
        ["Edited the basics and work", false],
      ]);
    });

    it("writes and logs nothing when an edit changes nothing", async () => {
      const base = ok(await saveProfile(you, json((await loadProfile(you)).resume), resume("Ada")));
      const again = ok(await saveProfile(you, json(base.resume), json(base.resume)));
      expect(again.changes).toHaveLength(1);
    });

    it("refuses to overwrite a change made somewhere else since the page loaded", async () => {
      const page = await loadProfile(you);
      await replaceProfile(agent, resume("Ada, by the agent"));

      const result = await saveProfile(you, json(page.resume), json(resume("Ada, by you")));
      expect(result).toMatchObject({ ok: false, reason: "conflict" });
      expect((await getProfile(you)).resume.basics.name).toBe("Ada, by the agent");
    });

    it("saves on top of the latest profile once the page has it", async () => {
      await replaceProfile(agent, resume("Ada, by the agent"));
      const latest = await loadProfile(you);
      expect(latest.changes[0]).toMatchObject({ by: "Claude Code", byAgent: true });

      const saved = ok(await saveProfile(you, json(latest.resume), json(resume("Ada, by you"))));
      expect(saved.resume.basics.name).toBe("Ada, by you");
    });

    it("rejects what isn't a resume, or is too large", async () => {
      const base = json((await loadProfile(you)).resume);
      expect(await saveProfile(you, base, "nope")).toMatchObject({ ok: false, reason: "invalid" });
      const huge = resume("x".repeat(MAX_PROFILE_BYTES));
      expect(await saveProfile(you, base, huge)).toMatchObject({ ok: false, reason: "invalid" });
      expect(await listChanges(you)).toEqual([]);
    });
  });

  describe("importing", () => {
    it("replaces the profile as one logged change, which Undo reverses", async () => {
      const before = ok(
        await saveProfile(you, json((await loadProfile(you)).resume), resume("Ada"))
      );

      const imported = ok(await importProfile(you, json(resume("Grace", ["COBOL"])), "grace.pdf"));
      expect(imported.resume.basics.name).toBe("Grace");
      expect(imported.changes[0]).toMatchObject({ summary: "Imported grace.pdf", undoable: true });
      expect(imported.changes[1]?.undoable).toBe(false);

      const undone = ok(await undoProfileChange(you, imported.changes[0]?.id as string));
      expect(undone.resume).toEqual(before.resume);
      expect(undone.changes[0]).toMatchObject({
        summary: "Undid: Imported grace.pdf",
        isUndo: true,
        undoable: true,
      });

      // Undoing the undo puts the import back.
      const redone = ok(await undoProfileChange(you, undone.changes[0]?.id as string));
      expect(redone.resume.basics.name).toBe("Grace");
    });

    it("refuses to undo anything but the newest change", async () => {
      const first = ok(await importProfile(you, resume("Grace"), "a.json"));
      await importProfile(you, resume("Hedy"), "b.json");
      const result = await undoProfileChange(you, first.changes[0]?.id as string);
      expect(result).toMatchObject({ ok: false, reason: "conflict" });
      expect((await getProfile(you)).resume.basics.name).toBe("Hedy");
    });

    it("keeps file names short and on one line in the log", async () => {
      const saved = ok(await importProfile(you, resume("Ada"), `cv\n${"x".repeat(200)}.pdf`));
      const summary = saved.changes[0]?.summary ?? "";
      expect(summary).not.toContain("\n");
      expect(summary.length).toBeLessThanOrEqual("Imported ".length + 80);
    });
  });
});

describe("toResumeInput", () => {
  it("keeps the model's sections and drops anything else", () => {
    const input = toResumeInput({
      basics: { name: "Ada" },
      work: [],
      meta: { theme: "x" },
      skills: "not a list",
    });
    expect(Object.keys(input).sort()).toEqual(["basics", "work"]);
  });
});

describe("describeProfileEdit", () => {
  it("names up to three changed sections, and counts beyond that", () => {
    const base = resume("Ada");
    expect(describeProfileEdit(base, { ...base, skills: [{ id: "s", name: "Go" }] })).toBe(
      "Edited skills"
    );
    expect(
      describeProfileEdit(base, {
        ...base,
        basics: { ...base.basics, name: "A" },
        skills: [{ id: "s", name: "Go" }],
        languages: [{ id: "l", language: "French" }],
      })
    ).toBe("Edited the basics, skills and languages");
    expect(
      describeProfileEdit(base, {
        ...base,
        basics: { ...base.basics, name: "A" },
        work: [],
        skills: [{ id: "s", name: "Go" }],
        languages: [{ id: "l", language: "French" }],
      })
    ).toBe("Edited 4 sections");
  });
});
