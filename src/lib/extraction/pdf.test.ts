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
                { str: "Jane", transform: [1, 0, 0, 1, 40, 720], width: 24, height: 12 },
                { str: "Doe", transform: [1, 0, 0, 1, 70, 720], width: 20, height: 12 },
                { str: "Software", transform: [1, 0, 0, 1, 40, 700], width: 45, height: 12 },
                { str: "Engineer", transform: [1, 0, 0, 1, 92, 700], width: 42, height: 12 },
                { str: "", transform: [1, 0, 0, 1, 10, 680], width: 0, height: 12 },
              ],
            }),
          })
          .mockResolvedValueOnce({
            getTextContent: vi.fn().mockResolvedValue({
              items: [
                { str: "Built", transform: [1, 0, 0, 1, 40, 720], width: 24, height: 12 },
                { str: "APIs", transform: [1, 0, 0, 1, 68, 720], width: 22, height: 12 },
                { str: "at", transform: [1, 0, 0, 1, 96, 720], width: 10, height: 12 },
                { str: "Acme", transform: [1, 0, 0, 1, 112, 720], width: 28, height: 12 },
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

  it("reconstructs lines when pdf items do not include hasEOL markers", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({
            items: [
              { str: "JANE", transform: [1, 0, 0, 1, 40, 720], width: 24, height: 12 },
              { str: "DOE", transform: [1, 0, 0, 1, 70, 720], width: 20, height: 12 },
              { str: "jane@example.com", transform: [1, 0, 0, 1, 40, 700], width: 80, height: 12 },
              { str: "+1 555-123-4567", transform: [1, 0, 0, 1, 132, 700], width: 78, height: 12 },
              { str: "EXPERIENCE", transform: [1, 0, 0, 1, 40, 660], width: 60, height: 12 },
              { str: "Acme Corp", transform: [1, 0, 0, 1, 40, 640], width: 54, height: 12 },
            ],
          }),
        }),
      }),
    });

    const { extractTextFromPDF } = await import("./pdf");
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(extractTextFromPDF(file)).resolves.toBe(
      "JANE DOE\njane@example.com +1 555-123-4567\n\nEXPERIENCE\nAcme Corp"
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
