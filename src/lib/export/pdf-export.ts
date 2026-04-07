import { DEFAULT_PDF_FONT, getPdfFont, type PdfFontId, type PdfMakeFontRuntime } from "./fonts";
import type { PdfTemplateOptions } from "./template-types";
import { loadPdfTemplateRenderer } from "@/lib/templates/registry";
import type { ResumeSchema, TemplateId } from "@/types/resume";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

let fontRegistrationPromise: Promise<void> | null = null;

async function ensurePdfMakeFontsRegistered(pdfMake: PdfMakeFontRuntime): Promise<void> {
  if (!fontRegistrationPromise) {
    fontRegistrationPromise = (async () => {
      const vfsFonts = await import("pdfmake/build/vfs_fonts");
      const robotoVfs = (vfsFonts.default ?? vfsFonts) as Record<string, string>;

      pdfMake.addVirtualFileSystem(robotoVfs);
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

export async function exportPDF(
  resume: ResumeSchema,
  template: TemplateId,
  font: PdfFontId = DEFAULT_PDF_FONT
): Promise<void> {
  const validation = validateResumeForExport(resume);

  if (!validation.ok) {
    throw new ResumeExportValidationError(validation.message ?? "Resume is not ready to export.");
  }

  // pdfmake accesses `window` on import — must be dynamic inside a browser callback
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeModule.default as PdfMakeFontRuntime & {
    createPdf: (docDefinition: TDocumentDefinitions) => { download: (filename: string) => void };
  };
  const selectedFont = getPdfFont(font);

  await ensurePdfMakeFontsRegistered(pdfMake);

  const docDef = await getDocDef(validation.normalizedResume, template, {
    fontFamily: selectedFont.family,
  });
  const filename = getFilename(validation.normalizedResume);

  pdfMake.createPdf(docDef).download(filename);
}
