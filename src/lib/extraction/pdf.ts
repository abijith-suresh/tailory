import * as pdfjs from "pdfjs-dist";

// Set the worker source to the file we copied to public/
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PositionedTextItem {
  height: number;
  str: string;
  width: number;
  x: number;
  y: number;
}

interface TextItemLike {
  height?: number;
  str: string;
  transform?: number[];
  width?: number;
}

function isTextItemLike(item: unknown): item is TextItemLike {
  return typeof item === "object" && item !== null && "str" in item && typeof item.str === "string";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function shouldInsertSpace(previous: PositionedTextItem, current: PositionedTextItem): boolean {
  const previousEnd = previous.x + previous.width;
  const gap = current.x - previousEnd;
  const minSpaceGap = Math.max(2, Math.min(previous.height, current.height) * 0.3);

  return gap > minSpaceGap;
}

function joinLineFragments(items: PositionedTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let line = "";

  for (let index = 0; index < sorted.length; index++) {
    const item = sorted[index];
    if (!item) continue;

    const value = item.str.replace(/\u00a0/g, " ");
    if (!value.trim()) continue;

    if (line && shouldInsertSpace(sorted[index - 1]!, item)) {
      line += " ";
    }

    line += value;
  }

  return normalizeWhitespace(line);
}

function reconstructPageText(items: unknown[]): string {
  const textItems = items
    .flatMap((item) => {
      if (!isTextItemLike(item)) {
        return [];
      }

      const value = item.str.replace(/\u00a0/g, " ");
      if (!value.trim()) {
        return [];
      }

      const transform = "transform" in item && Array.isArray(item.transform) ? item.transform : [];
      return [
        {
          str: value,
          x: typeof transform[4] === "number" ? transform[4] : 0,
          y: typeof transform[5] === "number" ? transform[5] : 0,
          width: "width" in item && typeof item.width === "number" ? item.width : value.length * 6,
          height: "height" in item && typeof item.height === "number" ? item.height : 12,
        } satisfies PositionedTextItem,
      ];
    })
    .sort((a, b) => {
      const yDifference = b.y - a.y;
      if (Math.abs(yDifference) > 1.5) {
        return yDifference;
      }

      return a.x - b.x;
    });

  if (textItems.length === 0) {
    return "";
  }

  const groupedLines: PositionedTextItem[][] = [];

  for (const item of textItems) {
    const currentLine = groupedLines[groupedLines.length - 1];
    if (!currentLine) {
      groupedLines.push([item]);
      continue;
    }

    const referenceY = currentLine[0]?.y ?? item.y;
    const referenceHeight = currentLine[0]?.height ?? item.height;
    const tolerance = Math.max(2, referenceHeight * 0.45);

    if (Math.abs(referenceY - item.y) <= tolerance) {
      currentLine.push(item);
      continue;
    }

    groupedLines.push([item]);
  }

  const joinedLines = groupedLines
    .map((lineItems) => {
      const lineText = joinLineFragments(lineItems);
      const y = lineItems[0]?.y ?? 0;
      const height = lineItems[0]?.height ?? 12;

      return lineText ? { height, text: lineText, y } : null;
    })
    .filter(Boolean) as Array<{ height: number; text: string; y: number }>;

  const lines: string[] = [];

  for (let index = 0; index < joinedLines.length; index++) {
    const line = joinedLines[index];
    if (!line) continue;

    if (index > 0) {
      const previous = joinedLines[index - 1];
      const verticalGap = previous ? previous.y - line.y : 0;
      const averageHeight = (line.height + (previous?.height ?? line.height)) / 2;

      if (verticalGap > averageHeight * 2.2) {
        lines.push("");
      }
    }

    lines.push(line.text);
  }

  return normalizeExtractedText(lines.join("\n"));
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\b([A-Za-z]{2,})-\n([a-z]{2,})\b/g, "$1$2")
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
    const pageText = reconstructPageText(content.items);

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
