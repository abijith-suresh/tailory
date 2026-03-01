import * as pdfjs from "pdfjs-dist";

// Set the worker source to the file we copied to public/
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
    const pageText = content.items
      .map((item) => {
        if ("str" in item) return item.str;
        return "";
      })
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}
