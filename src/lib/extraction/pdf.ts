import * as pdfjs from "pdfjs-dist";

// Set the worker source to the file we copied to public/
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract all text from a PDF file using pdfjs-dist.
 * Returns a single string with pages separated by newlines.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = normalizeExtractedText(
      content.items
        .map((item) => {
          if (!("str" in item) || !item.str.trim()) return "";
          return item.str + (item.hasEOL ? "\n" : " ");
        })
        .join("")
    );

    if (!pageText) continue;
    pageTexts.push(pageText);
  }

  const extractedText = pageTexts.join("\n\n").trim();

  if (!extractedText) {
    throw new Error(
      "No selectable text was found in this PDF. It may be a scanned PDF, so try a text-based PDF or DOCX file."
    );
  }

  return extractedText;
}
