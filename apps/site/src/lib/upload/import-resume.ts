import { parseJsonResumeImport } from "@/lib/resume/json";
import { type SupportedUploadExtension, validateUploadFileContent } from "@/lib/upload/guardrails";
import { processUploadedFile } from "@/lib/upload/process-file";
import type { ResumeSchema } from "@/types/resume";

/** What a PDF or DOCX import found, with a confidence score for the parse. */
export interface ParsedImportFeedback {
  confidence: number;
  certificates: number;
  education: number;
  projects: number;
  skills: number;
  work: number;
}

/** Top-level JSON fields that Tailory does not model and so did not import. */
export interface IgnoredFieldsFeedback {
  ignoredFields: string[];
}

export type ImportFeedback = ParsedImportFeedback | IgnoredFieldsFeedback;

export interface ImportResumeSuccess {
  success: true;
  resume: ResumeSchema;
  feedback?: ImportFeedback;
}

export interface ImportResumeFailure {
  success: false;
  error: string;
}

export type ImportResumeOutcome = ImportResumeSuccess | ImportResumeFailure;

export async function importResumeFile(
  file: File,
  extension: SupportedUploadExtension
): Promise<ImportResumeOutcome> {
  const contentValidation = await validateUploadFileContent(file, extension);
  if (!contentValidation.ok) {
    return { success: false, error: contentValidation.error };
  }

  if (extension === "json") {
    try {
      const text = await file.text();
      const { resume, ignoredFields } = parseJsonResumeImport(text);
      return ignoredFields.length > 0
        ? { success: true, resume, feedback: { ignoredFields } }
        : { success: true, resume };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to import this JSON Resume file. Please try another file.",
      };
    }
  }

  const outcome = await processUploadedFile(file, extension);

  if (!outcome.success) {
    return outcome;
  }

  const { result } = outcome;

  return {
    success: true,
    resume: result.data,
    feedback: {
      confidence: result.confidence,
      work: result.data.work?.length ?? 0,
      education: result.data.education?.length ?? 0,
      skills: result.data.skills?.length ?? 0,
      projects: result.data.projects?.length ?? 0,
      certificates: result.data.certificates?.length ?? 0,
    },
  };
}
