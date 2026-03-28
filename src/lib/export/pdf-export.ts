import type { ResumeSchema, TemplateId } from "@/types/resume";
import { ResumeExportValidationError, validateResumeForExport } from "@/lib/resume/normalize";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

function getFilename(resume: ResumeSchema): string {
  const name = resume.basics.name.trim().replace(/\s+/g, "_") || "resume";
  return `${name}_resume.pdf`;
}

async function getDocDef(
  resume: ResumeSchema,
  template: TemplateId
): Promise<TDocumentDefinitions> {
  if (template === "modern") {
    const { modernTemplate } = await import("@/lib/templates/modern");
    return modernTemplate(resume);
  }
  if (template === "minimal") {
    const { minimalTemplate } = await import("@/lib/templates/minimal");
    return minimalTemplate(resume);
  }
  // compact-ats (default)
  const { compactAtsTemplate } = await import("@/lib/templates/compact-ats");
  return compactAtsTemplate(resume);
}

export async function exportPDF(resume: ResumeSchema, template: TemplateId): Promise<void> {
  const validation = validateResumeForExport(resume);

  if (!validation.ok) {
    throw new ResumeExportValidationError(validation.message ?? "Resume is not ready to export.");
  }

  // pdfmake accesses `window` on import — must be dynamic inside a browser callback
  const pdfMake = await import("pdfmake/build/pdfmake");
  const vfsFonts = await import("pdfmake/build/vfs_fonts");

  // Attach virtual file system fonts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfMake as any).default.vfs = (vfsFonts as any).default.vfs;

  const docDef = await getDocDef(validation.normalizedResume, template);
  const filename = getFilename(validation.normalizedResume);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfMake as any).default.createPdf(docDef).download(filename);
}
