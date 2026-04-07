import type { ResumeSchema } from "@/types/resume";

import { parseJsonResumeString } from "@/lib/resume/json";
import { processUploadedFile } from "@/lib/upload/process-file";
import type { SupportedUploadExtension } from "@/lib/upload/guardrails";

export interface ImportResumeSuccess {
  success: true;
  resume: ResumeSchema;
  feedback?: {
    confidence: number;
    certificates: number;
    education: number;
    projects: number;
    skills: number;
    work: number;
  };
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
  if (extension === "json") {
    try {
      const text = await file.text();
      const resume = parseJsonResumeString(text);
      return { success: true, resume };
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
