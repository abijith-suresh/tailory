import { describe, expect, it, vi } from "vitest";
import { buildPdfDocument } from "../export/pdf-document.ts";
import {
  countPdfPages,
  loadTestPdfMake,
  longResume,
  sampleApplication,
  sampleProfile as sampleApplicationResume,
  veryLongResume,
} from "../test/support.ts";
import type { ResumeSchema } from "../types/resume.ts";
import { type FitInput, fitApplication, fitDocument, fitResume } from "./fit.ts";
import { createPageMeasurer, type MeasurePages } from "./measure.ts";
import { fitSteps } from "./steps.ts";

const measurePages = createPageMeasurer(loadTestPdfMake);

const input = (resume: ResumeSchema, pageTarget: number | null, autoFit = true): FitInput => ({
  resume,
  template: "modern",
  pageTarget,
  autoFit,
});

/** Prints the document the way the export does and counts its pages. */
async function exportedPages(fit: FitInput, stepIndex: number) {
  const step = fitSteps(fit.template)[stepIndex];
  const pdfMake = await loadTestPdfMake();
  const doc = buildPdfDocument(fit.resume, fit.template, { fitStep: step });
  return countPdfPages(await pdfMake.createPdf(doc).getBuffer());
}

/** Every line of text a document prints. */
function printedText(doc: unknown): string[] {
  if (Array.isArray(doc)) return doc.flatMap(printedText);
  if (!doc || typeof doc !== "object") return [];
  const node = doc as Record<string, unknown>;
  return [
    ...(typeof node.text === "string" ? [node.text] : []),
    ...printedText(node.stack),
    ...printedText(node.columns),
  ];
}

describe("fitResume", () => {
  it("only counts pages without a target", async () => {
    const result = await fitResume(input(longResume(), null), measurePages);

    expect(result).toMatchObject({ status: "none", stepIndex: 0, pagesNeeded: 2, linesOver: 0 });
    expect(result.pageStarts).toEqual([{ page: 2, blockId: expect.any(String) }]);
  });

  it("leaves a resume that fits as designed", async () => {
    const result = await fitResume(input(longResume(), 2), measurePages);
    expect(result).toMatchObject({ status: "fits", stepIndex: 0, pagesNeeded: 2 });
  });

  it("tightens as little as it can to meet the target", async () => {
    const fit = input(longResume(), 1);
    const result = await fitResume(fit, measurePages);

    expect(result).toMatchObject({ status: "tightened", pagesNeeded: 1, linesOver: 0 });
    expect(result.stepIndex).toBeGreaterThan(0);
    // One step less doesn't fit.
    expect(await exportedPages(fit, result.stepIndex - 1)).toBe(2);
  });

  it("reports the overflow untightened once tightening is off", async () => {
    const result = await fitResume(input(longResume(), 1, false), measurePages);

    expect(result).toMatchObject({ status: "over", stepIndex: 0, pagesNeeded: 2 });
    expect(result.linesOver).toBeGreaterThan(0);
    expect(result.pageStarts.map((start) => start.page)).toEqual([2]);
  });

  it("stops at the template's bounds and reports what is still over", async () => {
    const result = await fitResume(input(veryLongResume(), 1), measurePages);
    const steps = fitSteps("modern");

    expect(result).toMatchObject({ status: "over", stepIndex: steps.length - 1 });
    expect(result.step).toEqual(steps.at(-1));
    expect(result.pagesNeeded).toBeGreaterThan(1);

    // Roughly the lines on the pages past the target: more for a longer resume.
    const shorter = await fitResume(input(longResume(), 1, false), measurePages);
    expect(result.linesOver).toBeGreaterThan(shorter.linesOver);
  });

  it("reports the density it prints at, and how full the last page is", async () => {
    const asDesigned = await fitResume(input(longResume(), null), measurePages);
    expect(asDesigned.density).toEqual({ level: 0, bodyPt: 10, marginMm: 15.9 });
    expect(asDesigned.lastPageFill).toBeGreaterThan(0);
    expect(asDesigned.lastPageFill).toBeLessThan(1);

    const tightest = await fitResume(input(veryLongResume(), 1), measurePages);
    expect(tightest.density.level).toBe(1);
    expect(tightest.density.bodyPt).toBeCloseTo(9.5, 2);
    expect(tightest.density.marginMm).toBeCloseTo(10, 1);

    const tightened = await fitResume(input(longResume(), 1), measurePages);
    expect(tightened.density.level).toBeGreaterThan(0);
    expect(tightened.density.level).toBeLessThan(1);
  });

  it("fills the last page less as content goes", async () => {
    const profile = sampleApplicationResume();
    const full = await fitResume(input(profile, null), measurePages);
    const shorter = await fitResume(
      input({ ...profile, work: profile.work?.slice(0, 1) }, null),
      measurePages
    );
    expect(full.pagesNeeded).toBe(1);
    expect(full.lastPageFill).toBeLessThan(1);
    expect(shorter.lastPageFill).toBeGreaterThan(0);
    expect(shorter.lastPageFill).toBeLessThan(full.lastPageFill);
  });

  it("starts a page with a section heading rather than leave it at the foot of the last", async () => {
    const fit = input(longResume(), null);
    const result = await fitResume(fit, measurePages);
    const [start] = result.pageStarts;

    const blocks = new Map<string, Record<string, unknown>>();
    const collect = (content: unknown) => {
      if (Array.isArray(content)) return content.forEach(collect);
      if (!content || typeof content !== "object") return;
      const node = content as Record<string, unknown>;
      if (typeof node.id === "string") blocks.set(node.id, node);
      collect(node.stack);
    };
    collect(fitDocument(fit, result.step).content);

    // Without the rule, Education's heading stays on page 1 and its entry starts page 2.
    expect(blocks.get(start?.blockId ?? "")).toMatchObject({ text: "EDUCATION", headlineLevel: 1 });
  });

  it("never drops content, however far it tightens", async () => {
    const fit = input(veryLongResume(), 1);
    const result = await fitResume(fit, measurePages);

    expect(printedText(fitDocument(fit, result.step).content)).toEqual(
      printedText(buildPdfDocument(fit.resume, "modern").content)
    );
  });

  it.each([
    ["no target", null, true],
    ["a target it fits", 2, true],
    ["a target it tightens to meet", 1, true],
    ["tightening off", 1, false],
  ] as const)("measures the pages the exported PDF has, with %s", async (_, target, autoFit) => {
    const fit = input(longResume(), target, autoFit);
    const result = await fitResume(fit, measurePages);
    expect(await exportedPages(fit, result.stepIndex)).toBe(result.pagesNeeded);
  });

  it("measures each step at most once, and few of them", async () => {
    const measure = vi.fn<MeasurePages>(measurePages);
    await fitResume(input(longResume(), 1), measure);

    const steps = fitSteps("modern").length;
    expect(measure.mock.calls.length).toBeLessThanOrEqual(2 + Math.ceil(Math.log2(steps)));
  });
});

describe("fitApplication", () => {
  it("fits the resume the application prints, on its own page target", async () => {
    const profile = longResume();
    const application = sampleApplication({ templateId: "modern", pageTarget: 1 });

    const all = await fitApplication(profile, { ...application, autoFit: false }, measurePages);
    expect(all.fit).toMatchObject({ status: "over", pagesNeeded: 2 });

    // Leaving out two jobs brings it onto one page with no tightening.
    const cut = await fitApplication(
      profile,
      { ...application, excluded: ["work-C", "work-D"] },
      measurePages
    );
    expect(cut.fit).toMatchObject({ status: "fits", stepIndex: 0, pagesNeeded: 1 });
    expect(cut.resume.work?.map((entry) => entry.id)).toEqual(["work-A", "work-B"]);
    expect(cut.staleRewordings).toEqual([]);
  });
});
