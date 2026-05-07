import { beforeEach, describe, expect, it, vi } from "vitest";

import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { EMPTY_RESUME } from "@/types/resume";

const restoreAutosaveDraft = vi.fn();
const saveAutosaveDraft = vi.fn();

vi.mock("@/lib/storage/drafts", () => ({
  restoreAutosaveDraft,
  saveAutosaveDraft,
}));

describe("initializeAutosaveSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores autosave drafts for normal editor entry", async () => {
    restoreAutosaveDraft.mockResolvedValue({
      available: true,
      draft: {
        id: "autosave",
        name: "Autosave",
        createdAt: 1,
        updatedAt: 1,
        resumeData: EMPTY_RESUME,
      },
      snapshotJson: JSON.stringify(EMPTY_RESUME),
    });

    const { initializeAutosaveSession } = await import("./autosave-session");

    await expect(
      initializeAutosaveSession("restore-autosave", structuredClone(EMPTY_RESUME))
    ).resolves.toEqual({
      available: true,
      draft: {
        id: "autosave",
        name: "Autosave",
        createdAt: 1,
        updatedAt: 1,
        resumeData: EMPTY_RESUME,
      },
      snapshotJson: JSON.stringify(EMPTY_RESUME),
    });
    expect(saveAutosaveDraft).not.toHaveBeenCalled();
  });

  it("persists the current resume instead of restoring autosave for blank and import entry", async () => {
    saveAutosaveDraft.mockResolvedValue(true);

    const { initializeAutosaveSession } = await import("./autosave-session");
    const importedResume = {
      ...structuredClone(EMPTY_RESUME),
      basics: {
        ...structuredClone(EMPTY_RESUME.basics),
        name: "Jane Doe",
      },
    };

    await expect(
      initializeAutosaveSession("blank", structuredClone(EMPTY_RESUME))
    ).resolves.toMatchObject({
      available: true,
      skippedRestore: true,
      snapshotJson: expect.any(String),
    });
    await expect(initializeAutosaveSession("import", importedResume)).resolves.toMatchObject({
      available: true,
      skippedRestore: true,
      snapshotJson: expect.any(String),
    });

    expect(restoreAutosaveDraft).not.toHaveBeenCalled();
    expect(saveAutosaveDraft).toHaveBeenCalledTimes(2);
    expect(saveAutosaveDraft).toHaveBeenNthCalledWith(
      1,
      serializeNormalizedResume(structuredClone(EMPTY_RESUME))
    );
    expect(saveAutosaveDraft).toHaveBeenNthCalledWith(2, serializeNormalizedResume(importedResume));
  });
});
