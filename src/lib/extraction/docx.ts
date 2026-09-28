function isLegacyDocFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.trim().toLowerCase();
  return extension === "doc" || file.type === "application/msword";
}

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
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  if (isLegacyDocFile(file)) {
    throw new Error(
      "Legacy .doc files are not supported. Please save the document as .docx or PDF and try again."
    );
  }

  const mammoth = await getMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const extractedText = normalizeExtractedText(result.value);

  if (!extractedText) {
    throw new Error(
      "No text could be extracted from this DOCX file. Please try another DOCX or paste your resume into the editor."
    );
  }

  return extractedText;
}
