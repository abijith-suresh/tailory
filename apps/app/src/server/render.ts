// Fits, prints and exports resumes on the server, for the MCP tools and the web app. pdfmake's
// browser build runs in Node as is: it carries its own copy of pdfkit and reads fonts from a
// virtual file system, so the server build bundles it with Roboto and needs no files on disk.

import {
  type Application,
  buildPdfDocument,
  createPageMeasurer,
  DEFAULT_TEMPLATE_ID,
  exportJsonResumeDocument,
  type FitDensity,
  type FitResult,
  type FitStep,
  fitApplication,
  fitResume,
  PDF_FONT_FAMILY,
  type PdfLayoutRuntime,
  ResumeExportValidationError,
  type ResumeSchema,
  type Rewording,
  resolveApplication,
  type TemplateId,
  UNTIGHTENED,
  validateResumeForExport,
} from "@tailory/core";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

interface PdfMake extends PdfLayoutRuntime {
  createPdf: (doc: TDocumentDefinitions) => { getBuffer: () => Promise<Uint8Array> };
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
  addFonts: (fonts: Record<string, object>) => void;
}

let pdfMake: Promise<PdfMake> | null = null;

/** pdfmake with the fonts the templates use, loaded once per process. */
export function loadPdfMake(): Promise<PdfMake> {
  pdfMake ??= (async () => {
    const [pdfMakeModule, vfsModule] = await Promise.all([
      import("pdfmake/build/pdfmake.min"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    const runtime = (pdfMakeModule.default ?? pdfMakeModule) as unknown as PdfMake;
    runtime.addVirtualFileSystem(
      (vfsModule.default ?? vfsModule) as unknown as Record<string, string>
    );
    runtime.addFonts({
      [PDF_FONT_FAMILY]: {
        normal: "Roboto-Regular.ttf",
        bold: "Roboto-Medium.ttf",
        italics: "Roboto-Italic.ttf",
        bolditalics: "Roboto-MediumItalic.ttf",
      },
    });
    return runtime;
  })();
  return pdfMake;
}

const measurePages = createPageMeasurer(loadPdfMake);

/** How a resume falls on its page target, with a line an agent can act on. */
export interface PageResult {
  /** Pages the resume takes as it prints. */
  pagesNeeded: number;
  pageTarget: number | null;
  /** True when there is no target or the resume is within it. */
  fits: boolean;
  /** Spacing, margins or text were tightened to meet the target. */
  tightened: boolean;
  /** Roughly how many lines of body text run past the target. 0 when it fits. */
  linesOver: number;
  /** How much of the last page the content uses, from 0 to 1. */
  lastPageFill: number;
  /** How tight it prints: 0 to 1, with the body text size and narrowest margin. */
  density: FitDensity;
  /** Such as "1 page, fits" or "about 3 lines over 1 page". */
  message: string;
}

/** A resume as it will print, how it falls on its pages, and the step it is tightened to. */
export interface FittedResume {
  resume: ResumeSchema;
  template: TemplateId;
  page: PageResult;
  fit: FitResult;
}

export interface FittedApplicationResume extends FittedResume {
  /** Rewordings whose profile text has changed since they were made. They still print. */
  staleRewordings: Rewording[];
}

/** How the bare profile prints. It has no page target unless the caller gives one. */
export interface ProfileRenderOptions {
  template?: TemplateId;
  pageTarget?: number | null;
  autoFit?: boolean;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The page result in words: short, factual, and saying what the agent can change. */
export function describeFit(fit: FitResult, autoFit: boolean): string {
  const pages = plural(fit.pagesNeeded, "page");
  const target = fit.pageTarget;
  switch (fit.status) {
    case "none":
      return pages;
    case "fits":
      return `${pages}, fits`;
    case "tightened":
      return `${pages}, fits with tighter spacing`;
    case "over": {
      const over = `about ${plural(fit.linesOver, "line")} over ${plural(target ?? 0, "page")}`;
      return autoFit
        ? `${over} at the tightest; leave a line or two out`
        : `${over}; tightening is off`;
    }
  }
}

function pageResult(fit: FitResult, autoFit: boolean): PageResult {
  return {
    pagesNeeded: fit.pagesNeeded,
    pageTarget: fit.pageTarget,
    fits: fit.status !== "over",
    tightened: fit.status === "tightened",
    linesOver: fit.linesOver,
    lastPageFill: fit.lastPageFill,
    density: fit.density,
    message: describeFit(fit, autoFit),
  };
}

/** An application's resume as it will print, fitted to the application's page target. */
export async function fitApplicationResult(
  profile: ResumeSchema,
  application: Application
): Promise<FittedApplicationResume> {
  const fitted = await fitApplication(profile, application, measurePages);
  return {
    resume: fitted.resume,
    template: application.templateId,
    staleRewordings: fitted.staleRewordings,
    page: pageResult(fitted.fit, application.autoFit),
    fit: fitted.fit,
  };
}

/** The bare profile as it will print. */
export async function fitProfileResult(
  profile: ResumeSchema,
  options: ProfileRenderOptions = {}
): Promise<FittedResume> {
  const template = options.template ?? DEFAULT_TEMPLATE_ID;
  const autoFit = options.autoFit ?? false;
  const { resume } = resolveApplication(profile, { excluded: [], rewordings: [] });
  const fit = await fitResume(
    { resume, template, pageTarget: options.pageTarget ?? null, autoFit },
    measurePages
  );
  return { resume, template, page: pageResult(fit, autoFit), fit };
}

async function printPdf(
  resume: ResumeSchema,
  template: TemplateId,
  options: { step: FitStep; sectionOrder?: Application["sectionOrder"] }
): Promise<Uint8Array> {
  const validation = validateResumeForExport(resume);
  if (!validation.ok)
    throw new ResumeExportValidationError(validation.message ?? "Nothing to print.");
  const runtime = await loadPdfMake();
  const doc = buildPdfDocument(resume, template, {
    fitStep: options.step,
    sectionOrder: options.sectionOrder,
  });
  return runtime.createPdf(doc).getBuffer();
}

/**
 * The PDF of an application's resume, fitted as `fitApplicationResult` reports, or of the bare
 * profile when there is no application. Throws `ResumeExportValidationError` for a resume with
 * nothing to print.
 */
export async function renderPdf(
  profile: ResumeSchema,
  application: Application | null,
  options: ProfileRenderOptions = {}
): Promise<Uint8Array> {
  if (!application) {
    // Without a target there is nothing to fit, so skip the measure.
    if ((options.pageTarget ?? null) === null) {
      const { resume } = resolveApplication(profile, { excluded: [], rewordings: [] });
      return printPdf(resume, options.template ?? DEFAULT_TEMPLATE_ID, { step: UNTIGHTENED });
    }
    const fitted = await fitProfileResult(profile, options);
    return printPdf(fitted.resume, fitted.template, { step: fitted.fit.step });
  }
  return (await printApplication(profile, application)).pdf;
}

/**
 * An application's fit and its PDF from one measure, for the web app's preview. Throws
 * `ResumeExportValidationError` for a resume with nothing to print.
 */
export async function printApplication(
  profile: ResumeSchema,
  application: Application
): Promise<FittedApplicationResume & { pdf: Uint8Array }> {
  const fitted = await fitApplicationResult(profile, application);
  const pdf = await printPdf(fitted.resume, fitted.template, {
    step: fitted.fit.step,
    sectionOrder: application.sectionOrder,
  });
  return { ...fitted, pdf };
}

/** The JSON Resume document of an application's resume, or of the bare profile. */
export function renderJsonResume(
  profile: ResumeSchema,
  application: Application | null
): Record<string, unknown> {
  const { resume } = resolveApplication(profile, application ?? { excluded: [], rewordings: [] });
  return exportJsonResumeDocument(resume);
}
