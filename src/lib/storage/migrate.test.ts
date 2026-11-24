import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import { readDraftRecord } from "./migrate";

/** A resume as version 1 stored it: bullets are plain strings. */
function legacyResume(name: string): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    basics: { ...structuredClone(EMPTY_RESUME.basics), name, label: "Engineer" },
    work: [
      {
        id: "work-1",
        name: "Acme",
        position: "Engineer",
        startDate: "Jan 2021",
        highlights: ["Shipped the editor", "Cut load time in half"],
      },
    ],
    skills: [{ id: "skill-1", name: "TypeScript", keywords: ["Solid"] }],
  } as unknown as ResumeSchema;
}

function legacyDraft(id: string, name: string, updatedAt: number) {
  return { id, name, createdAt: 1, updatedAt, resumeData: legacyResume(name) };
}

/** Creates the database exactly as the first version of Tailory did, with drafts in it. */
async function seedVersion1(records: unknown[]) {
  const db = await openDB("tailory", 1, {
    upgrade(database) {
      database.createObjectStore("drafts", { keyPath: "id" });
    },
  });
  for (const record of records) await db.put("drafts", record);
  db.close();
}

async function readRaw() {
  const db = await openDB("tailory");
  const version = db.version;
  const records = db.objectStoreNames.contains("drafts") ? await db.getAll("drafts") : [];
  db.close();
  return { version, records };
}

async function loadStorage() {
  vi.resetModules();
  return import("./db");
}

describe("readDraftRecord", () => {
  it("turns a version 1 draft into a document with no versions", () => {
    const draft = readDraftRecord(legacyDraft("autosave", "Jane", 5));

    expect(draft).toEqual({
      id: "autosave",
      name: "Jane",
      createdAt: 1,
      updatedAt: 5,
      document: {
        master: expect.objectContaining({
          basics: expect.objectContaining({ name: "Jane", label: "Engineer" }),
          work: [
            expect.objectContaining({
              id: "work-1",
              highlights: [
                { id: expect.any(String), text: "Shipped the editor" },
                { id: expect.any(String), text: "Cut load time in half" },
              ],
            }),
          ],
          skills: [expect.objectContaining({ id: "skill-1", keywords: ["Solid"] })],
        }),
        versions: [],
      },
    });
  });

  it("reads a current draft without changing it", () => {
    const current = readDraftRecord(legacyDraft("draft-1", "Jane", 5));

    expect(readDraftRecord(current)).toEqual(current);
  });
});

describe("IndexedDB upgrade from version 1", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("migrates the autosave and every named draft without losing content", async () => {
    await seedVersion1([
      legacyDraft("autosave", "Jane", 30),
      legacyDraft("draft-1", "Jane Named", 20),
      legacyDraft("copy-2", "Jane (before import)", 10),
    ]);

    const storage = await loadStorage();
    const drafts = await storage.listDrafts();

    expect(drafts?.map((draft) => draft.id)).toEqual(["autosave", "draft-1", "copy-2"]);
    for (const draft of drafts ?? []) {
      expect(draft.document.versions).toEqual([]);
      expect(draft.document.master.basics.name).toBe(draft.name);
      expect(draft.document.master.work?.[0]?.highlights?.map((h) => h.text)).toEqual([
        "Shipped the editor",
        "Cut load time in half",
      ]);
    }

    const raw = await readRaw();
    expect(raw.version).toBe(storage.DB_VERSION);
    for (const record of raw.records) {
      expect(record).not.toHaveProperty("resumeData");
      expect(record).toHaveProperty("document.versions", []);
    }
  });

  it("gives bullets ids once, so they stay the same on every read", async () => {
    await seedVersion1([legacyDraft("autosave", "Jane", 30)]);

    const storage = await loadStorage();
    const first = await storage.getDraft("autosave");
    const second = await (await loadStorage()).getDraft("autosave");

    expect(first?.document.master.work?.[0]?.highlights?.map((h) => h.id)).toEqual(
      second?.document.master.work?.[0]?.highlights?.map((h) => h.id)
    );
  });

  it("keeps the version 1 data and stays unavailable if the upgrade fails", async () => {
    // A record whose key the migration can't keep makes the rewrite fail.
    await seedVersion1([legacyDraft("autosave", "Jane", 30), { ...legacyDraft("", "", 1), id: 7 }]);

    const storage = await loadStorage();

    await expect(storage.isDraftStorageAvailable()).resolves.toBe(false);
    await expect(storage.getDraft("autosave")).resolves.toBeNull();

    const raw = await readRaw();
    expect(raw.version).toBe(1);
    expect(raw.records).toContainEqual(legacyDraft("autosave", "Jane", 30));
  });

  it("stays unavailable instead of waiting while an old tab holds version 1 open", async () => {
    await seedVersion1([legacyDraft("autosave", "Jane", 30)]);
    const oldTab = await openDB("tailory", 1);

    const storage = await loadStorage();
    await expect(storage.isDraftStorageAvailable()).resolves.toBe(false);

    oldTab.close();
    const raw = await readRaw();
    expect(raw.records).toContainEqual(expect.objectContaining({ id: "autosave" }));
  });

  it("creates an empty store on a fresh browser", async () => {
    const storage = await loadStorage();

    await expect(storage.listDrafts()).resolves.toEqual([]);
    expect((await readRaw()).version).toBe(storage.DB_VERSION);
  });

  it("saves and reads back a document with versions", async () => {
    const storage = await loadStorage();
    const { createDocument, createVersion } = await import("@/lib/versions/document");
    const document = {
      ...createDocument(legacyResume("Jane")),
      versions: [createVersion({ name: "Acme" })],
    };

    await expect(
      storage.saveDraft({ id: "autosave", name: "Jane", createdAt: 1, updatedAt: 2, document })
    ).resolves.toBe(true);

    expect((await (await loadStorage()).getDraft("autosave"))?.document).toEqual(document);
  });
});
