import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import { loadPdfTemplateRenderer } from "@/lib/templates/registry";
import type { ResumeSectionKey } from "@/types/document";
import type { ResumeSchema, TemplateId } from "@/types/resume";
import { downloadBlob, isTouchFirstDevice, sanitizeFilenameBase } from "./download";
import { type PdfMakeFontRuntime, registerPdfFonts } from "./fonts";

let fontRegistrationPromise: Promise<void> | null = null;

async function ensurePdfMakeFontsRegistered(pdfMake: PdfMakeFontRuntime): Promise<void> {
  if (!fontRegistrationPromise) {
    fontRegistrationPromise = registerPdfFonts(pdfMake);
  }

  return fontRegistrationPromise;
}

function getFilename(resume: ResumeSchema, versionName?: string): string {
  const version = versionName?.trim() ? `_${sanitizeFilenameBase(versionName)}` : "";
  return `${sanitizeFilenameBase(resume.basics.name)}${version}_resume.pdf`;
}

interface BrowserPdfDocument {
  getBlob: () => Promise<Blob>;
}

interface PdfExportOptions {
  accentColor?: string;
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

  // pdfmake accesses `window` on import — must be dynamic inside a browser callback
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeModule.default as PdfMakeFontRuntime & {
    createPdf: (docDefinition: TDocumentDefinitions) => BrowserPdfDocument;
  };

  await ensurePdfMakeFontsRegistered(pdfMake);

  const docDef = loadPdfTemplateRenderer(template)(validation.normalizedResume, {
    accentColor: options.accentColor,
    sectionOrder: options.sectionOrder,
  });
  const filename = getFilename(validation.normalizedResume, options.versionName);
  const blob = await pdfMake.createPdf(docDef).getBlob();

  if (await maybeSharePdf(blob, filename)) {
    return;
  }

  downloadBlob(blob, filename);
}
