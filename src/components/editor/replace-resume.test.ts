import { afterEach, describe, expect, it, vi } from "vitest";

import { replaceResume } from "@/components/editor/replace-resume";
import { createDocument } from "@/lib/versions/document";
import { createVersion, loadDocument, versions } from "@/store/document";
import { resume } from "@/store/resume";
import type { ResumeDocument } from "@/types/document";
import { EMPTY_RESUME } from "@/types/resume";

const keepCopyBeforeReplacing = vi.hoisted(() => vi.fn());
const requestConfirm = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage/drafts", () => ({ keepCopyBeforeReplacing }));
vi.mock("@/components/ui/confirm", () => ({ requestConfirm }));

function resumeNamed(name: string): ResumeDocument {
  const data = structuredClone(EMPTY_RESUME);
  data.basics.name = name;
  return createDocument(data);
}

afterEach(() => {
  vi.resetAllMocks();
  loadDocument(createDocument(EMPTY_RESUME));
});

describe("replaceResume", () => {
  it("replaces the resume once a copy is kept", async () => {
    keepCopyBeforeReplacing.mockResolvedValue("saved");
    loadDocument(resumeNamed("Jane"));

    await expect(replaceResume(resumeNamed("Alex"), "import")).resolves.toBe(true);

    expect(keepCopyBeforeReplacing).toHaveBeenCalledWith(
      { master: resume, versions },
      expect.anything(),
      "import"
    );
    expect(requestConfirm).not.toHaveBeenCalled();
    expect(resume.basics.name).toBe("Alex");
  });

  it("replaces the versions along with the master", async () => {
    keepCopyBeforeReplacing.mockResolvedValue("saved");
    loadDocument(resumeNamed("Jane"));
    createVersion({ name: "Acme" });

    await replaceResume(resumeNamed("Alex"), "import");

    expect(versions).toEqual([]);
  });

  it("asks first when the copy can't be saved, and keeps the resume if cancelled", async () => {
    keepCopyBeforeReplacing.mockResolvedValue("failed");
    requestConfirm.mockResolvedValue(false);
    loadDocument(resumeNamed("Jane"));

    await expect(replaceResume(resumeNamed("Alex"), "draft")).resolves.toBe(false);

    expect(requestConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Replace without a copy?", confirmLabel: "Replace anyway" })
    );
    expect(resume.basics.name).toBe("Jane");

    requestConfirm.mockResolvedValue(true);
    await expect(replaceResume(resumeNamed("Alex"), "draft")).resolves.toBe(true);
    expect(resume.basics.name).toBe("Alex");
  });
});
