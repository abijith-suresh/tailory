import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  default: {},
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument,
}));

describe("extractTextFromPDF", () => {
  beforeEach(() => {
    getDocument.mockReset();
  });

  it("preserves page and line boundaries while skipping empty items", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: vi
          .fn()
          .mockResolvedValueOnce({
            getTextContent: vi.fn().mockResolvedValue({
              items: [
                { str: "Jane Doe", hasEOL: true },
                { str: "Software Engineer", hasEOL: false },
                { str: "", hasEOL: false },
              ],
            }),
          })
          .mockResolvedValueOnce({
            getTextContent: vi.fn().mockResolvedValue({
              items: [
                { str: "Built APIs", hasEOL: false },
                { str: "at Acme", hasEOL: true },
              ],
            }),
          }),
      }),
    });

    const { extractTextFromPDF } = await import("./pdf");
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(extractTextFromPDF(file)).resolves.toBe(
      "Jane Doe\nSoftware Engineer\n\nBuilt APIs at Acme"
    );
  });

  it("fails with a scanned PDF hint when pages contain no text", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [{ str: "   ", hasEOL: false }],
          }),
        }),
      }),
    });

    const { extractTextFromPDF } = await import("./pdf");
    const file = new File(["pdf"], "empty.pdf", { type: "application/pdf" });

    await expect(extractTextFromPDF(file)).rejects.toThrow(
      "No selectable text was found in this PDF. It may be a scanned PDF, so try a text-based PDF or DOCX file."
    );
  });
});
