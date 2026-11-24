import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const isDraftStorageAvailable = vi.fn();
const getDraft = vi.fn();
const saveDraft = vi.fn();
const listDrafts = vi.fn();

vi.mock("@/lib/storage/db", () => ({
  AUTOSAVE_DRAFT_ID: "autosave",
  getDraft,
  isDraftStorageAvailable,
  listDrafts,
  saveDraft,
}));

function storedDraft(id: string, resumeData: ResumeSchema, name = resumeData.basics.name) {
  return { id, name, createdAt: 1, updatedAt: 1, resumeData };
}

function createResume(overrides?: DeepPartial<ResumeSchema>): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    ...overrides,
    basics: {
      ...structuredClone(EMPTY_RESUME.basics),
      ...overrides?.basics,
      location: {
        ...structuredClone(EMPTY_RESUME.basics.location ?? {}),
        ...overrides?.basics?.location,
      },
    },
  };
}

describe("autosave draft helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unavailable when IndexedDB access is blocked", async () => {
    isDraftStorageAvailable.mockResolvedValue(false);

    const { restoreAutosaveDraft } = await import("./drafts");

    await expect(restoreAutosaveDraft()).resolves.toEqual({ available: false });
    expect(getDraft).not.toHaveBeenCalled();
  });

  it("reports a failed read instead of treating it as no saved resume", async () => {
    isDraftStorageAvailable.mockResolvedValue(true);
    getDraft.mockResolvedValue(null);

    const { restoreAutosaveDraft } = await import("./drafts");

    await expect(restoreAutosaveDraft()).resolves.toEqual({ available: true, readFailed: true });
  });

  it("asks for persistent storage only once", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persist } });
    vi.resetModules();
    const { requestPersistentStorage } = await import("./drafts");

    requestPersistentStorage();
    requestPersistentStorage();

    expect(persist).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("ignores persistent storage when the browser doesn't support it", async () => {
    vi.stubGlobal("navigator", {});
    vi.resetModules();
    const { requestPersistentStorage } = await import("./drafts");

    expect(() => requestPersistentStorage()).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("restores a normalized autosave draft and snapshot", async () => {
    const rawResume = createResume({
      basics: {
        name: "  Jane Doe  ",
        url: "janedoe.dev ",
      },
      skills: [{ id: "skill-1", name: " TypeScript ", keywords: [" testing ", ""] }],
    });

    isDraftStorageAvailable.mockResolvedValue(true);
    getDraft.mockResolvedValue({
      id: "autosave",
      name: "Jane Draft",
      createdAt: 100,
      updatedAt: 200,
      resumeData: rawResume,
    });

    const { restoreAutosaveDraft } = await import("./drafts");
    const result = await restoreAutosaveDraft();

    expect(result).toMatchObject({
      available: true,
      draft: {
        id: "autosave",
        name: "Jane Draft",
        resumeData: {
          basics: expect.objectContaining({
            name: "Jane Doe",
            url: "https://janedoe.dev",
          }),
          skills: [expect.objectContaining({ name: "TypeScript", keywords: ["testing"] })],
        },
      },
      snapshotJson: serializeNormalizedResume(rawResume),
    });

    expect(result.draft?.resumeData).not.toBe(rawResume);
    result.draft?.resumeData.skills?.push({ id: "skill-2", name: "New Skill", keywords: [] });
    expect(rawResume.skills).toHaveLength(1);
  });

  it("saves normalized autosave content with stable timestamps", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234567890);
    const rawResume = createResume({
      basics: {
        name: "  Jane Doe  ",
      },
      projects: [{ id: "project-1", name: " Portfolio ", url: "janedoe.dev" }],
    });

    saveDraft.mockResolvedValue(true);

    const { saveAutosaveDraft } = await import("./drafts");

    await expect(saveAutosaveDraft(JSON.stringify(rawResume))).resolves.toBe(true);
    expect(saveDraft).toHaveBeenCalledWith({
      id: "autosave",
      name: "Jane Doe",
      createdAt: 1234567890,
      updatedAt: 1234567890,
      resumeData: expect.objectContaining({
        basics: expect.objectContaining({ name: "Jane Doe" }),
        projects: [expect.objectContaining({ name: "Portfolio", url: "https://janedoe.dev" })],
      }),
    });

    nowSpy.mockRestore();
  });

  it("returns false when autosave snapshot json is malformed", async () => {
    const { saveAutosaveDraft } = await import("./drafts");

    await expect(saveAutosaveDraft("{")).resolves.toBe(false);
    expect(saveDraft).not.toHaveBeenCalled();
  });
});

describe("named drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveDraft.mockResolvedValue(true);
  });

  it("updates the draft that already has the same name", async () => {
    const resume = createResume({ basics: { name: "Jane Doe" } });
    listDrafts.mockResolvedValue([
      storedDraft("autosave", resume),
      storedDraft("draft-1", createResume({ basics: { name: "Jane Doe", label: "Old" } })),
    ]);

    const { saveNamedDraft } = await import("./drafts");

    await expect(saveNamedDraft(resume)).resolves.toBe(true);
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-1", name: "Jane Doe" })
    );
  });

  it("creates a new draft when no draft has the name", async () => {
    vi.spyOn(Date, "now").mockReturnValue(42);
    listDrafts.mockResolvedValue([
      storedDraft("draft-1", createResume({ basics: { name: "Alex" } })),
    ]);

    const { saveNamedDraft } = await import("./drafts");

    await expect(saveNamedDraft(createResume())).resolves.toBe(true);
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-42", name: "Untitled" })
    );
    vi.restoreAllMocks();
  });

  it("does not save when existing drafts can't be read", async () => {
    listDrafts.mockResolvedValue(null);

    const { saveNamedDraft } = await import("./drafts");

    await expect(saveNamedDraft(createResume({ basics: { name: "Jane" } }))).resolves.toBe(false);
    expect(saveDraft).not.toHaveBeenCalled();
  });
});

describe("keeping a copy before replacing the resume", () => {
  const current = createResume({ basics: { name: "Jane Doe", label: "Engineer" } });
  const incoming = createResume({ basics: { name: "Imported" } });

  beforeEach(() => {
    vi.clearAllMocks();
    saveDraft.mockResolvedValue(true);
    listDrafts.mockResolvedValue([]);
  });

  it("saves the current resume as a clearly named draft", async () => {
    vi.spyOn(Date, "now").mockReturnValue(7);
    const { keepCopyBeforeReplacing } = await import("./drafts");

    await expect(keepCopyBeforeReplacing(current, incoming, "import")).resolves.toBe("saved");
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "copy-7",
        name: "Jane Doe (before import)",
        resumeData: expect.objectContaining({
          basics: expect.objectContaining({ label: "Engineer" }),
        }),
      })
    );

    await keepCopyBeforeReplacing(current, incoming, "draft");
    expect(saveDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Jane Doe (before loading draft)" })
    );
    vi.restoreAllMocks();
  });

  it("skips an empty resume", async () => {
    const { keepCopyBeforeReplacing } = await import("./drafts");

    await expect(keepCopyBeforeReplacing(createResume(), incoming, "import")).resolves.toBe(
      "not-needed"
    );
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("skips a resume that the replacement would not change", async () => {
    const { keepCopyBeforeReplacing } = await import("./drafts");

    await expect(keepCopyBeforeReplacing(current, current, "draft")).resolves.toBe("not-needed");
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("skips a resume that is already saved as a named draft", async () => {
    listDrafts.mockResolvedValue([storedDraft("draft-1", current)]);
    const { keepCopyBeforeReplacing } = await import("./drafts");

    await expect(keepCopyBeforeReplacing(current, incoming, "draft")).resolves.toBe("not-needed");
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("still saves a copy when only the autosave matches", async () => {
    listDrafts.mockResolvedValue([storedDraft("autosave", current)]);
    const { keepCopyBeforeReplacing } = await import("./drafts");

    await expect(keepCopyBeforeReplacing(current, incoming, "import")).resolves.toBe("saved");
  });

  it("reports failure when drafts can't be read or written", async () => {
    const { keepCopyBeforeReplacing } = await import("./drafts");

    listDrafts.mockResolvedValueOnce(null);
    await expect(keepCopyBeforeReplacing(current, incoming, "import")).resolves.toBe("failed");

    saveDraft.mockResolvedValueOnce(false);
    await expect(keepCopyBeforeReplacing(current, incoming, "import")).resolves.toBe("failed");
  });
});
