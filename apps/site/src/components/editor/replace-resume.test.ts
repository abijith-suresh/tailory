import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { replaceResume } from "@/components/editor/replace-resume";
import { loadResume, resume } from "@/store/resume";

const keepCopyBeforeReplacing = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/drafts", () => ({ keepCopyBeforeReplacing }));

function resumeNamed(name: string): ResumeSchema {
  const data = structuredClone(EMPTY_RESUME);
  data.basics.name = name;
  return data;
}

afterEach(() => {
  vi.restoreAllMocks();
  loadResume(structuredClone(EMPTY_RESUME));
});

describe("replaceResume", () => {
  it("replaces the resume once a copy is kept", async () => {
    keepCopyBeforeReplacing.mockResolvedValue("saved");
    const confirm = vi.spyOn(window, "confirm");
    loadResume(resumeNamed("Jane"));

    await expect(replaceResume(resumeNamed("Alex"), "import")).resolves.toBe(true);

    expect(keepCopyBeforeReplacing).toHaveBeenCalledWith(resume, expect.anything(), "import");
    expect(confirm).not.toHaveBeenCalled();
    expect(resume.basics.name).toBe("Alex");
  });

  it("asks first when the copy can't be saved, and keeps the resume if cancelled", async () => {
    keepCopyBeforeReplacing.mockResolvedValue("failed");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    loadResume(resumeNamed("Jane"));

    await expect(replaceResume(resumeNamed("Alex"), "draft")).resolves.toBe(false);

    expect(confirm).toHaveBeenCalledWith(
      "Couldn't save a copy of your current resume. Replace it anyway?"
    );
    expect(resume.basics.name).toBe("Jane");

    confirm.mockReturnValue(true);
    await expect(replaceResume(resumeNamed("Alex"), "draft")).resolves.toBe(true);
    expect(resume.basics.name).toBe("Alex");
  });
});
