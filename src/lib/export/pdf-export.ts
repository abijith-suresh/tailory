import { fitResume } from "@/lib/fit/fit";
import { measurePages } from "@/lib/fit/measure-pdf";
import { UNTIGHTENED } from "@/lib/fit/steps";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import type { PageFit, ResumeSectionKey } from "@/types/document";
import type { ResumeSchema, TemplateId } from "@/types/resume";
import { downloadBlob, isTouchFirstDevice, sanitizeFilenameBase } from "./download";
import { buildPdfDocument } from "./pdf-document";
import { loadPdfMake } from "./pdfmake-runtime";

function getFilename(resume: ResumeSchema, versionName?: string): string {
  const version = versionName?.trim() ? `_${sanitizeFilenameBase(versionName)}` : "";
  return `${sanitizeFilenameBase(resume.basics.name)}${version}_resume.pdf`;
}

interface PdfExportOptions {
  accentColor?: string;
  /** A page target to fit, tightened as the preview tightens it. */
  pageFit?: PageFit;
  /** A version's section order; see `resolveVersion` for the resume itself. */
  sectionOrder?: readonly ResumeSectionKey[];
  /** Added to the file name, so each version's PDF gets its own. */
  versionName?: string;
}

async function maybeSharePdf(blob: Blob, filename: string): Promise<boolean> {
  const nav = globalThis.navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (!isTouchFirstDevice() || typeof File === "undefined" || typeof nav.share !== "function") {
    return false;
  }

  const file = new File([blob], filename, { type: "application/pdf" });
  const shareData: ShareData = {
    files: [file],
    title: filename,
  };

  if (typeof nav.canShare === "function" && !nav.canShare(shareData)) {
    return false;
  }

  try {
    await nav.share(shareData);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }

    return false;
  }
}

export async function exportPDF(
  resume: ResumeSchema,
  template: TemplateId,
  options: PdfExportOptions = {}
): Promise<void> {
  const validation = validateResumeForExport(resume);

  if (!validation.ok) {
    throw new ResumeExportValidationError(validation.message ?? "Resume is not ready to export.");
  }

  const pdfMake = await loadPdfMake();
  const normalized = validation.normalizedResume;
  const { accentColor, sectionOrder, pageFit } = options;
  // The same search the preview runs, so the PDF has the pages the preview shows.
  const fitStep = pageFit
    ? (
        await fitResume(
          { resume: normalized, template, accentColor, sectionOrder, ...pageFit },
          measurePages
        )
      ).step
    : UNTIGHTENED;
  const docDef = buildPdfDocument(normalized, template, { accentColor, sectionOrder, fitStep });
  const filename = getFilename(normalized, options.versionName);
  const blob = await pdfMake.createPdf(docDef).getBlob();

  if (await maybeSharePdf(blob, filename)) {
    return;
  }

  downloadBlob(blob, filename);
}
