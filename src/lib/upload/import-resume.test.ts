import { beforeEach, describe, expect, it, vi } from "vitest";

const processUploadedFile = vi.fn();
const parseJsonResumeString = vi.fn();

vi.mock("@/lib/upload/process-file", () => ({
  processUploadedFile,
}));

vi.mock("@/lib/resume/json", () => ({
  parseJsonResumeString,
}));

describe("importResumeFile", () => {
  beforeEach(() => {
    processUploadedFile.mockReset();
    parseJsonResumeString.mockReset();
  });

  it("routes JSON files through the JSON Resume parser", async () => {
    parseJsonResumeString.mockReturnValue({
      basics: { name: "Jane Doe" },
      work: [],
      education: [],
      skills: [],
      projects: [],
      certificates: [],
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
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

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
