import { beforeEach, describe, expect, it, vi } from "vitest";

const extractRawText = vi.fn();

vi.mock("mammoth", () => ({
  default: {
    extractRawText,
  },
}));

describe("extractTextFromDOCX", () => {
  beforeEach(() => {
    extractRawText.mockReset();
  });

  it("normalizes mammoth output whitespace", async () => {
    extractRawText.mockResolvedValue({
      value: "Jane Doe\r\nSoftware Engineer\u00a0\n\n\nExperience",
    });

    const { extractTextFromDOCX } = await import("./docx");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(extractTextFromDOCX(file)).resolves.toBe(
      "Jane Doe\nSoftware Engineer\n\nExperience"
    );
  });

  it("rejects legacy .doc files", async () => {
    const { extractTextFromDOCX } = await import("./docx");
    const file = new File(["doc"], "resume.doc", {
      type: "application/msword",
    });

    await expect(extractTextFromDOCX(file)).rejects.toThrow(
      "Legacy .doc files are not supported. Please save the document as .docx or PDF and try again."
    );
    expect(extractRawText).not.toHaveBeenCalled();
  });

  it("fails when mammoth returns blank text", async () => {
    extractRawText.mockResolvedValue({
      value: "\n\n  \u00a0\n",
    });

    const { extractTextFromDOCX } = await import("./docx");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(extractTextFromDOCX(file)).rejects.toThrow(
      "No text could be extracted from this DOCX file. Please try another DOCX or paste your resume into the editor."
    );
  });
});
