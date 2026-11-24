import { render, screen } from "@solidjs/testing-library";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { describe, expect, it } from "vitest";
import { buildPdfDocument } from "@/lib/export/pdf-document";
import { longResume } from "@/test/long-resume";
import PdfPage, { type PageBreakMark } from "./PdfPage";

// pdfmake's types leave `id` off columns, but pdfmake reads it on every node.
const doc = {
  content: [
    { text: "Jane Doe", style: "name", id: "block-0" },
    {
      stack: [
        {
          columns: [
            { text: "Acme", style: "title", width: "*" },
            { text: "2020 - 2022", width: 80, alignment: "right" },
          ],
          columnGap: 12,
          id: "block-1",
        },
        { text: "Shipped it.\nTwice.", margin: [0, 2, 0, 0], id: "block-2" },
      ],
    },
  ],
  styles: { name: { fontSize: 20, bold: true }, title: { fontSize: 11, italics: true } },
  defaultStyle: { fontSize: 10 },
  pageMargins: [45, 30, 40, 20],
} as TDocumentDefinitions;

describe("PdfPage", () => {
  it("draws the document's text with its styles, sizes and margins in points", () => {
    render(() => <PdfPage doc={doc} breaks={new Map()} />);

    const name = screen.getByText("Jane Doe");
    expect(name.style.fontSize).toBe("20pt");
    expect(name.style.fontWeight).toBe("500");
    expect(screen.getByText("Acme").style.fontStyle).toBe("italic");
    expect(screen.getByText("2020 - 2022").parentElement?.style.flex).toBe("0 0 80pt");
    expect(screen.getByText(/Shipped it/).style.marginTop).toBe("2pt");
    expect(name.closest(".pdf-page")?.getAttribute("style")).toContain(
      "padding: 30pt 40pt 20pt 45pt"
    );
  });

  it("marks the block each page starts with, and which pages are past the target", () => {
    const breaks = new Map<string, PageBreakMark>([
      ["block-1", { page: 2, over: false }],
      ["block-2", { page: 3, over: true }],
    ]);
    render(() => <PdfPage doc={doc} breaks={breaks} />);

    const page2 = screen.getByRole("separator", { name: "Page 2" });
    const page3 = screen.getByRole("separator", { name: "Page 3, past the target" });
    expect(page3.textContent).toBe("Page 3");
    expect(page2.nextElementSibling?.textContent).toContain("Acme");
    expect(page3.nextElementSibling?.textContent).toBe("Shipped it.\nTwice.");
    expect(page3.classList).toContain("page-break--over");
    expect(page2.classList).not.toContain("page-break--over");
  });

  it("draws every line a resume's PDF prints", () => {
    const pdf = buildPdfDocument(longResume(), "modern");
    const { container } = render(() => <PdfPage doc={pdf} breaks={new Map()} />);

    expect(container.textContent).toContain("Led work item 5 at Company D");
    expect(container.textContent).toContain("Languages: TypeScript, Rust, Go");
  });
});
