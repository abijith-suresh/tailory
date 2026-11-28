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

  it("rejects text over the extraction limit", async () => {
    const { MAX_EXTRACTED_TEXT_LENGTH } = await import("./limits");
    extractRawText.mockResolvedValue({ value: "a".repeat(MAX_EXTRACTED_TEXT_LENGTH + 1) });

    const { extractTextFromDOCX } = await import("./docx");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(extractTextFromDOCX(file)).rejects.toThrow(
      "This DOCX contains too much text to process safely. Please upload a shorter resume."
    );
  });

  it("accepts text at the extraction limit", async () => {
    const { MAX_EXTRACTED_TEXT_LENGTH } = await import("./limits");
    const text = "a".repeat(MAX_EXTRACTED_TEXT_LENGTH);
    extractRawText.mockResolvedValue({ value: text });

    const { extractTextFromDOCX } = await import("./docx");
    const file = new File(["docx"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await expect(extractTextFromDOCX(file)).resolves.toBe(text);
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
      "No text could be extracted from this DOCX file. Try another DOCX, or a PDF or JSON file."
    );
  });
});
