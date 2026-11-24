import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeDocument } from "@/types/document";
import type { ResumeSchema } from "@/types/resume";

interface DraftRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  document: ResumeDocument;
}

const sampleResume = (name: string): ResumeSchema => ({
  basics: {
    name,
    label: "",
    email: "",
    phone: "",
    url: "",
    summary: "",
    location: {
      city: "",
      region: "",
      countryCode: "",
    },
    profiles: [],
  },
  work: [],
  education: [],
  skills: [],
  projects: [],
  certificates: [],
});

/** A draft as IndexedDB version 1 stored it. */
interface LegacyDraftRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  resumeData: ResumeSchema;
}

const sampleDocument = (name: string): ResumeDocument => ({
  master: sampleResume(name),
  versions: [],
});

function createOpenDbMock(options?: {
  seed?: Array<[string, DraftRecord | LegacyDraftRecord]>;
  openError?: Error;
  putError?: Error;
  getError?: Error;
  getAllError?: Error;
  deleteError?: Error;
}) {
  const drafts = new Map(options?.seed ?? []);

  const put = vi.fn(async (_store: string, draft: DraftRecord | LegacyDraftRecord) => {
    if (options?.putError) {
      throw options.putError;
    }

    drafts.set(draft.id, draft);
  });

  return vi.fn(async () => {
    if (options?.openError) {
      throw options.openError;
    }

    return {
      get: vi.fn(async (_store: string, id: string) => {
        if (options?.getError) {
          throw options.getError;
        }

        return drafts.get(id);
      }),
      put,
      transaction: vi.fn(() => {
        const puts: Promise<void>[] = [];
        return {
          store: {
            put: (draft: DraftRecord) => {
              const request = put("drafts", draft);
              puts.push(request);
              return request;
            },
          },
          commit: vi.fn(),
          get done() {
            return Promise.all(puts).then(() => undefined);
          },
        };
      }),
      getAll: vi.fn(async () => {
        if (options?.getAllError) {
          throw options.getAllError;
        }

        return Array.from(drafts.values());
      }),
      delete: vi.fn(async (_store: string, id: string) => {
        if (options?.deleteError) {
          throw options.deleteError;
        }

        drafts.delete(id);
      }),
    };
  });
}

async function loadStorageModule(options?: Parameters<typeof createOpenDbMock>[0]) {
  vi.resetModules();

  const openDB = createOpenDbMock(options);
  vi.doMock("idb", () => ({ openDB }));

  const storage = await import("./db");
  return { storage, openDB };
}

describe("draft storage", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("preserves createdAt when overwriting an existing autosave", async () => {
    const { storage } = await loadStorageModule({
      seed: [
        [
          "autosave",
          {
            id: "autosave",
            name: "Jane",
            createdAt: 123,
            updatedAt: 456,
            document: sampleDocument("Jane"),
          },
        ],
      ],
    });

    const saved = await storage.saveDraft({
      id: storage.AUTOSAVE_DRAFT_ID,
      name: "Jane Doe",
      createdAt: 999,
      updatedAt: 789,
      document: sampleDocument("Jane Doe"),
    });

    expect(saved).toBe(true);
    await expect(storage.getDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toMatchObject({
      createdAt: 123,
      updatedAt: 789,
      name: "Jane Doe",
    });
  });

  it("normalizes resume data before persisting drafts", async () => {
    const { storage } = await loadStorageModule();

    await expect(
      storage.saveDraft({
        id: storage.AUTOSAVE_DRAFT_ID,
        name: "  ",
        createdAt: 1,
        updatedAt: 2,
        document: {
          master: {
            ...sampleResume("  Jane Doe  "),
            basics: {
              ...sampleResume("  Jane Doe  ").basics,
              url: "janedoe.dev ",
            },
            skills: [
              { id: "skill-1", name: " TypeScript ", keywords: [] },
              { id: "skill-2", name: " ", keywords: [] },
            ],
          },
          versions: [],
        },
      })
    ).resolves.toBe(true);

    await expect(storage.getDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toMatchObject({
      name: "Untitled",
      document: {
        master: {
          basics: expect.objectContaining({
            name: "Jane Doe",
            url: "https://janedoe.dev",
          }),
          skills: [expect.objectContaining({ id: "skill-1", name: "TypeScript" })],
        },
        versions: [],
      },
    });
  });

  it("returns safe defaults when IndexedDB cannot open", async () => {
    const { storage } = await loadStorageModule({ openError: new Error("blocked") });

    await expect(storage.isDraftStorageAvailable()).resolves.toBe(false);
    await expect(
      storage.saveDraft({
        id: storage.AUTOSAVE_DRAFT_ID,
        name: "Jane",
        createdAt: 1,
        updatedAt: 1,
        document: sampleDocument("Jane"),
      })
    ).resolves.toBe(false);
    await expect(storage.getDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toBeNull();
    await expect(storage.listDrafts()).resolves.toBeNull();
    await expect(storage.deleteDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toBe(false);
  });

  it("writes without reading first once it knows the draft", async () => {
    const { storage, openDB } = await loadStorageModule({
      seed: [
        [
          "autosave",
          {
            id: "autosave",
            name: "Jane",
            createdAt: 123,
            updatedAt: 456,
            document: sampleDocument("Jane"),
          },
        ],
      ],
    });
    await storage.getDraft(storage.AUTOSAVE_DRAFT_ID);
    const db = await openDB.mock.results[0].value;
    db.get.mockClear();

    // Nothing to await between the call and the write, so it still runs as the page closes.
    const saving = storage.saveDraft({
      id: storage.AUTOSAVE_DRAFT_ID,
      name: "Jane Doe",
      createdAt: 999,
      updatedAt: 789,
      document: sampleDocument("Jane Doe"),
    });
    for (let i = 0; i < 5; i++) await Promise.resolve();

    expect(db.get).not.toHaveBeenCalled();
    expect(db.put).toHaveBeenCalledWith(
      "drafts",
      expect.objectContaining({ name: "Jane Doe", createdAt: 123 })
    );
    await expect(saving).resolves.toBe(true);
  });

  it("reconnects for the next save after a failed write", async () => {
    const { storage, openDB } = await loadStorageModule({ putError: new Error("write failed") });
    const draft = {
      id: storage.AUTOSAVE_DRAFT_ID,
      name: "Jane",
      createdAt: 1,
      updatedAt: 1,
      document: sampleDocument("Jane"),
    };

    await expect(storage.saveDraft(draft)).resolves.toBe(false);
    await storage.saveDraft(draft);

    expect(openDB).toHaveBeenCalledTimes(2);
  });

  it("tells a missing draft apart from one that can't be read", async () => {
    const missing = await loadStorageModule();
    await expect(missing.storage.getDraft("nope")).resolves.toBeUndefined();

    const failing = await loadStorageModule({ getError: new Error("read failed") });
    await expect(failing.storage.getDraft(failing.storage.AUTOSAVE_DRAFT_ID)).resolves.toBeNull();
  });

  it("returns null instead of an empty list when drafts can't be read", async () => {
    const { storage } = await loadStorageModule({ getAllError: new Error("read failed") });

    await expect(storage.listDrafts()).resolves.toBeNull();
  });

  it("lists normalized drafts in descending updated order, reading the version 1 shape", async () => {
    const { storage } = await loadStorageModule({
      seed: [
        [
          "older",
          {
            id: "older",
            name: "  Older Draft  ",
            createdAt: 10,
            updatedAt: 20,
            resumeData: {
              ...sampleResume("  Jane Doe  "),
              skills: [{ id: "skill-1", name: " TypeScript ", keywords: [] }],
            },
          },
        ],
        [
          "newer",
          {
            id: "newer",
            name: "  ",
            createdAt: 30,
            updatedAt: 40,
            resumeData: {
              ...sampleResume("  Alex Doe  "),
              basics: {
                ...sampleResume("  Alex Doe  ").basics,
                url: "alex.dev ",
              },
            },
          },
        ],
      ],
    });

    await expect(storage.listDrafts()).resolves.toEqual([
      expect.objectContaining({
        id: "newer",
        name: "Untitled",
        document: {
          master: expect.objectContaining({
            basics: expect.objectContaining({
              name: "Alex Doe",
              url: "https://alex.dev",
            }),
          }),
          versions: [],
        },
      }),
      expect.objectContaining({
        id: "older",
        name: "Older Draft",
        document: {
          master: expect.objectContaining({
            basics: expect.objectContaining({ name: "Jane Doe" }),
            skills: [expect.objectContaining({ name: "TypeScript" })],
          }),
          versions: [],
        },
      }),
    ]);
  });
});
