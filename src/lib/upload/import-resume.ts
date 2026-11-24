import { isTailoryBackup, parseBackupDocument } from "@/lib/resume/backup";
import { parseJsonResumeImport } from "@/lib/resume/json";
import { type SupportedUploadExtension, validateUploadFileContent } from "@/lib/upload/guardrails";
import { processUploadedFile } from "@/lib/upload/process-file";
import { createDocument } from "@/lib/versions/document";
import type { ResumeDocument } from "@/types/document";

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
  /** A Tailory backup brings its versions; any other file gives a resume with no versions. */
  document: ResumeDocument;
  feedback?: ImportFeedback;
}

export interface ImportResumeFailure {
  success: false;
  error: string;
}

export type ImportResumeOutcome = ImportResumeSuccess | ImportResumeFailure;

function parseJsonFile(text: string): ImportResumeSuccess {
  const backup = parseBackupIfPresent(text);
  if (backup) return { success: true, document: backup };

  const { resume, ignoredFields } = parseJsonResumeImport(text);
  const document = createDocument(resume);
  return ignoredFields.length > 0
    ? { success: true, document, feedback: { ignoredFields } }
    : { success: true, document };
}

function parseBackupIfPresent(text: string): ResumeDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Not JSON at all; the JSON Resume parser reports that.
    return null;
  }
  return isTailoryBackup(parsed) ? parseBackupDocument(parsed) : null;
}

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
      return parseJsonFile(await file.text());
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
    document: createDocument(result.data),
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
