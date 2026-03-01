import mammoth from "mammoth";

/**
 * Extract plain text from a DOCX file using mammoth.
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
