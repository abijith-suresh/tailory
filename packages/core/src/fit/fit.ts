import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { type ResolvedApplication, resolveApplication } from "../applications/resolve.ts";
import { buildPdfDocument } from "../export/pdf-document.ts";
import type { Application, ResumeSectionKey } from "../types/application.ts";
import type { ResumeSchema } from "../types/resume.ts";
import type { TemplateId } from "../types/template.ts";
import type { MeasurePages, PageLayout } from "./measure.ts";
import { type FitStep, fitSteps } from "./steps.ts";

/** Roboto's line height as pdfmake sets it, per point of font size. */
export const ROBOTO_LINE_HEIGHT = 2400 / 2048;

export interface FitInput {
  resume: ResumeSchema;
  template: TemplateId;
  accentColor?: string;
  sectionOrder?: readonly ResumeSectionKey[];
  pageTarget: number | null;
  autoFit: boolean;
}

/**
 * - `none`: no target, so only the page count matters.
 * - `fits`: on target as designed.
 * - `tightened`: on target after tightening.
 * - `over`: past the target, tightened as far as allowed or not at all.
 */
export type FitStatus = "none" | "fits" | "tightened" | "over";

export interface FitResult {
  status: FitStatus;
  /** Index into the template's steps; 0 is untightened. */
  stepIndex: number;
  step: FitStep;
  pageCount: number;
  pageTarget: number | null;
  /** Roughly how many lines of body text run past the target. 0 unless over. */
  linesOver: number;
  /** For each page after the first, the block it starts with. */
  pageStarts: PageLayout["pageStarts"];
}

/** The height of one line of body text in a document, in points. */
function bodyLineHeight(doc: TDocumentDefinitions): number {
  const body = doc.styles?.body ?? {};
  const fontSize = body.fontSize ?? doc.defaultStyle?.fontSize ?? 10;
  const lineHeight = body.lineHeight ?? doc.defaultStyle?.lineHeight ?? 1;
  return fontSize * lineHeight * ROBOTO_LINE_HEIGHT;
}

/** The document a fit input gives at one step. */
export function fitDocument(input: FitInput, step: FitStep): TDocumentDefinitions {
  return buildPdfDocument(input.resume, input.template, {
    accentColor: input.accentColor,
    sectionOrder: input.sectionOrder,
    fitStep: step,
  });
}

/**
 * Finds the least tightening that brings a resume within its page target. Without a target, or
 * with tightening off, it only measures. When even the tightest step runs over, that step is kept
 * and the overflow reported. Content is never dropped.
 *
 * Pages never grow as a step tightens, so the search halves the steps between the first that
 * fits and the last that doesn't: a handful of layouts at most.
 */
export async function fitResume(input: FitInput, measure: MeasurePages): Promise<FitResult> {
  const steps = fitSteps(input.template);
  const target = input.pageTarget;
  const layouts = new Map<number, PageLayout>();
  const layoutAt = async (index: number) => {
    let layout = layouts.get(index);
    if (!layout) {
      layout = await measure(fitDocument(input, steps[index] as FitStep));
      layouts.set(index, layout);
    }
    return layout;
  };
  const fits = async (index: number) =>
    target !== null && (await layoutAt(index)).pageCount <= target;

  const result = async (status: FitStatus, stepIndex: number): Promise<FitResult> => {
    const layout = await layoutAt(stepIndex);
    const step = steps[stepIndex] as FitStep;
    const linesOver =
      status === "over" && target !== null
        ? Math.max(
            1,
            Math.ceil(layout.heightPast(target) / bodyLineHeight(fitDocument(input, step)))
          )
        : 0;
    return {
      status,
      stepIndex,
      step,
      pageCount: layout.pageCount,
      pageTarget: target,
      linesOver,
      pageStarts: layout.pageStarts,
    };
  };

  if (target === null) return result("none", 0);
  if (await fits(0)) return result("fits", 0);
  const tightest = steps.length - 1;
  if (!input.autoFit) return result("over", 0);
  if (!(await fits(tightest))) return result("over", tightest);

  let low = 1;
  let high = tightest;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (await fits(middle)) high = middle;
    else low = middle + 1;
  }
  return result("tightened", high);
}

/** An application's resume as it will print, and how it falls on its page target. */
export interface FittedApplication extends ResolvedApplication {
  fit: FitResult;
}

/**
 * Resolves an application against the profile and fits the result to the application's page
 * target, with its template and section order.
 */
export async function fitApplication(
  profile: ResumeSchema,
  application: Application,
  measure: MeasurePages,
  options: { accentColor?: string } = {}
): Promise<FittedApplication> {
  const resolved = resolveApplication(profile, application);
  const fit = await fitResume(
    {
      resume: resolved.resume,
      template: application.templateId,
      accentColor: options.accentColor,
      sectionOrder: application.sectionOrder,
      pageTarget: application.pageTarget,
      autoFit: application.autoFit,
    },
    measure
  );
  return { ...resolved, fit };
}
