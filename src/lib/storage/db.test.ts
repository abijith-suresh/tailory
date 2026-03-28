import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResumeSchema } from "@/types/resume";

interface DraftRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  resumeData: ResumeSchema;
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

function createOpenDbMock(options?: {
  seed?: Array<[string, DraftRecord]>;
  openError?: Error;
  putError?: Error;
  getError?: Error;
  getAllError?: Error;
  deleteError?: Error;
}) {
  const drafts = new Map(options?.seed ?? []);

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
      put: vi.fn(async (_store: string, draft: DraftRecord) => {
        if (options?.putError) {
          throw options.putError;
        }

        drafts.set(draft.id, draft);
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
            resumeData: sampleResume("Jane"),
          },
        ],
      ],
    });

    const saved = await storage.saveDraft({
      id: storage.AUTOSAVE_DRAFT_ID,
      name: "Jane Doe",
      createdAt: 999,
      updatedAt: 789,
      resumeData: sampleResume("Jane Doe"),
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
        resumeData: {
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
      })
    ).resolves.toBe(true);

    await expect(storage.getDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toMatchObject({
      name: "Untitled",
      resumeData: {
        basics: expect.objectContaining({
          name: "Jane Doe",
          url: "https://janedoe.dev",
        }),
        skills: [expect.objectContaining({ id: "skill-1", name: "TypeScript" })],
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
        resumeData: sampleResume("Jane"),
      })
    ).resolves.toBe(false);
    await expect(storage.getDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toBeUndefined();
    await expect(storage.listDrafts()).resolves.toEqual([]);
    await expect(storage.deleteDraft(storage.AUTOSAVE_DRAFT_ID)).resolves.toBe(false);
  });

  it("lists normalized drafts in descending updated order", async () => {
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
        resumeData: expect.objectContaining({
          basics: expect.objectContaining({
            name: "Alex Doe",
            url: "https://alex.dev",
          }),
        }),
      }),
      expect.objectContaining({
        id: "older",
        name: "Older Draft",
        resumeData: expect.objectContaining({
          basics: expect.objectContaining({ name: "Jane Doe" }),
          skills: [expect.objectContaining({ name: "TypeScript" })],
        }),
      }),
    ]);
  });
});
