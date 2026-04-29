import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import { serializeNormalizedResume } from "@/lib/resume/normalize";

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

vi.mock("@/lib/storage/db", () => ({
  AUTOSAVE_DRAFT_ID: "autosave",
  getDraft,
  isDraftStorageAvailable,
  saveDraft,
}));

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
