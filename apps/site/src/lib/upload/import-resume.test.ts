import { beforeEach, describe, expect, it, vi } from "vitest";

const processUploadedFile = vi.fn();
const parseJsonResumeImport = vi.fn();

vi.mock("@/lib/upload/process-file", () => ({
  processUploadedFile,
}));

vi.mock("@tailory/core", () => ({
  parseJsonResumeImport,
}));

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
      resume: {
        basics: { name: "Jane Doe" },
        work: [],
        education: [],
        skills: [],
        projects: [],
        certificates: [],
      },
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
      resume,
      feedback: { ignoredFields: ["meta", "custom"] },
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
      resume: {
        basics: { name: "Jane Doe" },
        work: [{ id: "work-1", name: "Acme", position: "Engineer" }],
        education: [],
        skills: [{ id: "skill-1", name: "TypeScript" }],
        projects: [],
        certificates: [],
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
