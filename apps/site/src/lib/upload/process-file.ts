import type { ParseResult } from "@/lib/parser/resume-parser";

export interface ProcessFileSuccess {
  success: true;
  result: ParseResult;
}

export interface ProcessFileFailure {
  success: false;
  error: string;
}

export type ProcessFileOutcome = ProcessFileSuccess | ProcessFileFailure;

/**
 * Extracts text from a validated PDF or DOCX file and parses it into resume data.
 * Assumes the file has already been validated by validateUploadFile().
 */
export async function processUploadedFile(
  file: File,
  extension: "pdf" | "docx"
): Promise<ProcessFileOutcome> {
  try {
    let rawText: string;

    if (extension === "pdf") {
      const { extractTextFromPDF } = await import("@/lib/extraction/pdf");
      rawText = await extractTextFromPDF(file);
    } else {
      const { extractTextFromDOCX } = await import("@/lib/extraction/docx");
      rawText = await extractTextFromDOCX(file);
    }

    const { parseResume } = await import("@/lib/parser/resume-parser");
    const result = await parseResume(rawText);
    return { success: true, result };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to process file. Please try a different file.",
    };
  }
}
