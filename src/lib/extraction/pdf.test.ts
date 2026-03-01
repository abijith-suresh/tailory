import { describe, expect, it, vi } from "vitest";

// pdfjs-dist requires browser APIs (DOMMatrix etc.) unavailable in jsdom.
// We test that the module exports the correct function signature by mocking
// the pdfjs-dist dependency.

vi.mock("pdfjs-dist", () => ({
  default: {},
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

describe("pdf extraction module", () => {
  it("exports extractTextFromPDF function", async () => {
    const mod = await import("./pdf");
    expect(typeof mod.extractTextFromPDF).toBe("function");
  });
});
