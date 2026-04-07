import { sharePrintJob } from "./print-channel";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import { createPrintJob, deletePrintJob, purgeExpiredPrintJobs } from "@/lib/export/print-job";
import type { ResumeSchema, TemplateId } from "@/types/resume";

interface PrintExportOptions {
  accentColor: string;
}

function buildPrintUrl(jobId: string): string {
  return `/print?job=${encodeURIComponent(jobId)}`;
}

export async function exportBrowserPrint(
  resume: ResumeSchema,
  template: TemplateId,
  options: PrintExportOptions
): Promise<void> {
  const validation = validateResumeForExport(resume);

  if (!validation.ok) {
    throw new ResumeExportValidationError(validation.message ?? "Resume is not ready to export.");
  }

  try {
    purgeExpiredPrintJobs();
  } catch {
    throw new Error("Print storage is unavailable in this browser.");
  }

  let jobId: string;
  try {
    const printJob = createPrintJob(validation.normalizedResume, template, options.accentColor);
    jobId = printJob.jobId;
    const stopSharing = sharePrintJob(printJob.jobId, printJob.payload);
    window.setTimeout(stopSharing, 5000);
  } catch {
    throw new Error("Print storage is unavailable in this browser.");
  }

  const printWindow = window.open(buildPrintUrl(jobId), "_blank", "noopener,noreferrer");

  if (!printWindow) {
    if (jobId) {
      try {
        deletePrintJob(jobId);
      } catch {
        // Ignore cleanup failures if storage is already unavailable.
      }
    }
    throw new Error("Pop-up blocked. Please allow pop-ups to print your resume.");
  }
}
