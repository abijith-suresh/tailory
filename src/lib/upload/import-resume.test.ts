import { beforeEach, describe, expect, it, vi } from "vitest";

const processUploadedFile = vi.fn();
const parseJsonResumeImport = vi.fn();

vi.mock("@/lib/upload/process-file", () => ({
  processUploadedFile,
}));

vi.mock("@/lib/resume/json", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/resume/json")>()),
  parseJsonResumeImport,
}));

/** A resume with no versions, as an import gives it. */
const documentFor = (name: string) => ({
  master: expect.objectContaining({ basics: expect.objectContaining({ name }) }),
  versions: [],
});

describe("importResumeFile", () => {
  beforeEach(() => {
    processUploadedFile.mockReset();
    parseJsonResumeImport.mockReset();
  });

  it("routes JSON files through the JSON Resume parser", async () => {
    parseJsonResumeImport.mockReturnValue({
      resume: {
        basics: { name: "Jane Doe" },
        work: [],
        education: [],
        skills: [],
        projects: [],
        certificates: [],
      },
      ignoredFields: [],
    });

    const { importResumeFile } = await import("./import-resume");
    const file = new File([JSON.stringify({ basics: { name: "Jane Doe" } })], "resume.json", {
      type: "application/json",
    });

    await expect(importResumeFile(file, "json")).resolves.toEqual({
      success: true,
      document: documentFor("Jane Doe"),
    });
    expect(processUploadedFile).not.toHaveBeenCalled();
  });

  it("returns the ignored JSON field names as feedback", async () => {
    const resume = { basics: { name: "Jane Doe" } };
    parseJsonResumeImport.mockReturnValue({ resume, ignoredFields: ["meta", "custom"] });

    const { importResumeFile } = await import("./import-resume");
    const file = new File(["{}"], "resume.json", { type: "application/json" });

    await expect(importResumeFile(file, "json")).resolves.toEqual({
      success: true,
      document: documentFor("Jane Doe"),
      feedback: { ignoredFields: ["meta", "custom"] },
    });
  });

  it("reads a Tailory backup with its versions instead of as a JSON Resume", async () => {
    const { exportBackupString } = await import("@/lib/resume/backup");
    const { createDocument, createVersion } = await import("@/lib/versions/document");
    const { EMPTY_RESUME } = await import("@/types/resume");
    const master = structuredClone(EMPTY_RESUME);
    master.basics.name = "Jane Doe";
    const backup = { ...createDocument(master), versions: [createVersion({ name: "Acme" })] };

    const { importResumeFile } = await import("./import-resume");
    const file = new File([exportBackupString(backup)], "backup.json", {
      type: "application/json",
    });

    await expect(importResumeFile(file, "json")).resolves.toEqual({
      success: true,
      document: backup,
    });
    expect(parseJsonResumeImport).not.toHaveBeenCalled();
  });

  it("returns a backup that can't be read as an import error", async () => {
    const { importResumeFile } = await import("./import-resume");
    const file = new File([JSON.stringify({ format: "tailory-backup", version: 99 })], "b.json", {
      type: "application/json",
    });

    await expect(importResumeFile(file, "json")).resolves.toEqual({
      success: false,
      error: "This backup comes from a newer Tailory. Reload the page and try again.",
    });
  });

  it("returns a parse failure as an import error", async () => {
    parseJsonResumeImport.mockImplementation(() => {
      throw new Error("Invalid JSON Resume: 'work' must be an array.");
    });

    const { importResumeFile } = await import("./import-resume");
    const file = new File(["{}"], "resume.json", { type: "application/json" });

    await expect(importResumeFile(file, "json")).resolves.toEqual({
      success: false,
      error: "Invalid JSON Resume: 'work' must be an array.",
    });
  });

  it("routes PDF and DOCX files through the parser pipeline and returns feedback", async () => {
    processUploadedFile.mockResolvedValue({
      success: true,
      result: {
        confidence: 82,
        data: {
          basics: { name: "Jane Doe" },
          work: [{ id: "work-1", name: "Acme", position: "Engineer" }],
          education: [],
          skills: [{ id: "skill-1", name: "TypeScript" }],
          projects: [],
          certificates: [],
        },
      },
    });

    const { importResumeFile } = await import("./import-resume");
    const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });

    await expect(importResumeFile(file, "pdf")).resolves.toEqual({
      success: true,
      document: {
        master: expect.objectContaining({
          basics: expect.objectContaining({ name: "Jane Doe" }),
          work: [expect.objectContaining({ id: "work-1", name: "Acme", position: "Engineer" })],
          skills: [expect.objectContaining({ id: "skill-1", name: "TypeScript" })],
        }),
        versions: [],
      },
      feedback: {
        confidence: 82,
        work: 1,
        education: 0,
        skills: 1,
        projects: 0,
        certificates: 0,
      },
    });
    expect(processUploadedFile).toHaveBeenCalledWith(file, "pdf");
  });
});
