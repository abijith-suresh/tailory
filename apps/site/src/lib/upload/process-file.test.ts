import { beforeEach, describe, expect, it, vi } from "vitest";

const extractTextFromPDF = vi.fn();
const extractTextFromDOCX = vi.fn();
const parseResume = vi.fn();

vi.mock("@/lib/extraction/pdf", () => ({
  extractTextFromPDF,
}));

vi.mock("@/lib/extraction/docx", () => ({
  extractTextFromDOCX,
}));

vi.mock("@/lib/parser/resume-parser", () => ({
  parseResume,
}));

describe("processUploadedFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes pdf files through the pdf extractor and parser", async () => {
    const parseResult = {
      confidence: 85,
      data: { basics: { name: "Jane Doe" }, work: [], education: [], skills: [] },
      rawSections: { header: "Jane Doe" },
    };

    extractTextFromPDF.mockResolvedValue("pdf resume text");
    parseResume.mockResolvedValue(parseResult);

    const { processUploadedFile } = await import("./process-file");
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(processUploadedFile(file, "pdf")).resolves.toEqual({
      success: true,
      result: parseResult,
    });
    expect(extractTextFromPDF).toHaveBeenCalledWith(file);
    expect(extractTextFromDOCX).not.toHaveBeenCalled();
    expect(parseResume).toHaveBeenCalledWith("pdf resume text");
  });

  it("routes docx files through the docx extractor and parser", async () => {
    const parseResult = {
      confidence: 78,
      data: { basics: { name: "Jane Doe" }, work: [], education: [], skills: [] },
      rawSections: { header: "Jane Doe" },
    };

    extractTextFromDOCX.mockResolvedValue("docx resume text");
    parseResume.mockResolvedValue(parseResult);

    const { processUploadedFile } = await import("./process-file");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(processUploadedFile(file, "docx")).resolves.toEqual({
      success: true,
      result: parseResult,
    });
    expect(extractTextFromDOCX).toHaveBeenCalledWith(file);
    expect(extractTextFromPDF).not.toHaveBeenCalled();
    expect(parseResume).toHaveBeenCalledWith("docx resume text");
  });

  it("returns extractor errors directly", async () => {
    extractTextFromPDF.mockRejectedValue(new Error("Failed to read PDF"));

    const { processUploadedFile } = await import("./process-file");
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(processUploadedFile(file, "pdf")).resolves.toEqual({
      success: false,
      error: "Failed to read PDF",
    });
  });

  it("falls back to a generic message for non-error throws", async () => {
    extractTextFromDOCX.mockRejectedValue("boom");

    const { processUploadedFile } = await import("./process-file");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(processUploadedFile(file, "docx")).resolves.toEqual({
      success: false,
      error: "Failed to process file. Please try a different file.",
    });
  });
});
