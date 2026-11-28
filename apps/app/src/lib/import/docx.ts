import { MAX_EXTRACTED_TEXT_LENGTH } from "./limits";

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface MammothModule {
  extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
}

let mammothPromise: Promise<MammothModule> | null = null;

async function getMammoth(): Promise<MammothModule> {
  if (!mammothPromise) {
    mammothPromise = import("mammoth").then((mod) => {
      return ((mod as unknown as { default?: MammothModule }).default ?? mod) as MammothModule;
    });
  }
  return mammothPromise;
}

/**
 * Extract plain text from a DOCX file using mammoth.
 * Assumes the file has already been validated by validateUploadFile(), which rejects legacy .doc.
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await getMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const extractedText = normalizeExtractedText(result.value);

  if (!extractedText) {
    throw new Error(
      "No text could be extracted from this DOCX file. Try another DOCX, or a PDF or JSON file."
    );
  }

  if (extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
    throw new Error(
      "This DOCX contains too much text to process safely. Please upload a shorter resume."
    );
  }

  return extractedText;
}
