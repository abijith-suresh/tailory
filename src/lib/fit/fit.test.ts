import { describe, expect, it, vi } from "vitest";
import { buildPdfDocument } from "@/lib/export/pdf-document";
import { loadPdfMake } from "@/lib/export/pdfmake-runtime";
import { countPdfPages, longResume, veryLongResume } from "@/test/long-resume";
import type { ResumeSchema } from "@/types/resume";
import { type FitInput, fitDocument, fitResume } from "./fit";
import { createPageMeasurer, type MeasurePages } from "./measure";
import { fitSteps } from "./steps";

const measurePages = createPageMeasurer(loadPdfMake);

const input = (resume: ResumeSchema, pageTarget: number | null, autoFit = true): FitInput => ({
  resume,
  template: "modern",
  pageTarget,
  autoFit,
});

/** Prints the document the way the export does and counts its pages. */
async function exportedPages(fit: FitInput, stepIndex: number) {
  const step = fitSteps(fit.template)[stepIndex];
  const pdfMake = await loadPdfMake();
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

    expect(result).toMatchObject({ status: "none", stepIndex: 0, pageCount: 2, linesOver: 0 });
    expect(result.pageStarts).toEqual([{ page: 2, blockId: expect.any(String) }]);
  });

  it("leaves a resume that fits as designed", async () => {
    const result = await fitResume(input(longResume(), 2), measurePages);
    expect(result).toMatchObject({ status: "fits", stepIndex: 0, pageCount: 2 });
  });

  it("tightens as little as it can to meet the target", async () => {
    const fit = input(longResume(), 1);
    const result = await fitResume(fit, measurePages);

    expect(result).toMatchObject({ status: "tightened", pageCount: 1, linesOver: 0 });
    expect(result.stepIndex).toBeGreaterThan(0);
    // One step less doesn't fit.
    expect(await exportedPages(fit, result.stepIndex - 1)).toBe(2);
  });

  it("reports the overflow untightened once tightening is off", async () => {
    const result = await fitResume(input(longResume(), 1, false), measurePages);

    expect(result).toMatchObject({ status: "over", stepIndex: 0, pageCount: 2 });
    expect(result.linesOver).toBeGreaterThan(0);
    expect(result.pageStarts.map((start) => start.page)).toEqual([2]);
  });

  it("stops at the template's bounds and reports what is still over", async () => {
    const resume = veryLongResume();
    const result = await fitResume(input(resume, 1), measurePages);
    const steps = fitSteps("modern");

    expect(result).toMatchObject({ status: "over", stepIndex: steps.length - 1 });
    expect(result.step).toEqual(steps.at(-1));
    expect(result.pageCount).toBeGreaterThan(1);

    // Roughly the lines on the pages past the target: more for a longer resume.
    const shorter = await fitResume(input(longResume(), 1, false), measurePages);
    expect(result.linesOver).toBeGreaterThan(shorter.linesOver);
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
    expect(await exportedPages(fit, result.stepIndex)).toBe(result.pageCount);
  });

  it("measures each step at most once, and few of them", async () => {
    const measure = vi.fn<MeasurePages>(measurePages);
    await fitResume(input(longResume(), 1), measure);

    const steps = fitSteps("modern").length;
    expect(measure.mock.calls.length).toBeLessThanOrEqual(2 + Math.ceil(Math.log2(steps)));
  });
});
