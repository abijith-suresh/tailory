import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { PageFormat } from "@/lib/resume/design";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import { loadPdfTemplateRenderer } from "@/lib/templates/registry";
import type { ResumeSchema, TemplateId } from "@/types/resume";
import { DEFAULT_PDF_FONT, getPdfFont, type PdfFontId, type PdfMakeFontRuntime } from "./fonts";
import type { PdfTemplateOptions } from "./template-types";

let fontRegistrationPromise: Promise<void> | null = null;

async function ensurePdfMakeFontsRegistered(pdfMake: PdfMakeFontRuntime): Promise<void> {
  if (!fontRegistrationPromise) {
    fontRegistrationPromise = (async () => {
      await getPdfFont(DEFAULT_PDF_FONT).register(pdfMake);
    })();
  }

  return fontRegistrationPromise;
}

function getFilename(resume: ResumeSchema): string {
  const name = resume.basics.name.trim().replace(/\s+/g, "_") || "resume";
  return `${name}_resume.pdf`;
}

async function getDocDef(
  resume: ResumeSchema,
  template: TemplateId,
  options: PdfTemplateOptions
): Promise<TDocumentDefinitions> {
  const renderTemplate = await loadPdfTemplateRenderer(template);
  return renderTemplate(resume, options);
}

interface BrowserPdfDocument {
  getBlob: () => Promise<Blob>;
}

interface PdfExportOptions {
  accentColor?: string;
  font?: PdfFontId;
  pageFormat?: PageFormat;
}

async function maybeSharePdf(blob: Blob, filename: string): Promise<boolean> {
  const nav = globalThis.navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (typeof File === "undefined" || typeof nav.share !== "function") {
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

function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
  const selectedFont = getPdfFont(options.font ?? DEFAULT_PDF_FONT);

  await ensurePdfMakeFontsRegistered(pdfMake);

  const docDef = await getDocDef(validation.normalizedResume, template, {
    accentColor: options.accentColor,
    fontFamily: selectedFont.family,
    pageFormat: options.pageFormat,
  });
  const filename = getFilename(validation.normalizedResume);
  const blob = await pdfMake.createPdf(docDef).getBlob();

  if (await maybeSharePdf(blob, filename)) {
    return;
  }

  downloadPdfBlob(blob, filename);
}
