import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { describe, expect, it } from "vitest";
import { buildPdfDocument } from "../export/pdf-document.ts";
import { sampleProfile } from "../test/support.ts";
import { TEMPLATE_IDS } from "../types/template.ts";
import {
  applyFitStep,
  FIT_BOUNDS,
  fitSteps,
  MIN_BODY_TEXT_PT,
  MIN_PAGE_MARGIN_MM,
  stepDensity,
  TEMPLATE_METRICS,
  UNTIGHTENED,
} from "./steps.ts";

describe("fitSteps", () => {
  it.each(TEMPLATE_IDS)("starts untightened and ends at the %s template's bounds", (template) => {
    const steps = fitSteps(template);
    expect(steps[0]).toEqual(UNTIGHTENED);
    expect(steps.at(-1)).toEqual(FIT_BOUNDS[template]);
  });

  it.each(TEMPLATE_IDS)("tightens %s spacing, then margins, then text", (template) => {
    const steps = fitSteps(template);
    const bounds = FIT_BOUNDS[template];
    const firstNarrowerMargin = steps.findIndex((step) => step.margin < 1);
    const firstSmallerText = steps.findIndex((step) => step.text < 1);

    expect(firstNarrowerMargin).toBeGreaterThan(1);
    expect(steps[firstNarrowerMargin - 1]).toEqual({ ...bounds, text: 1, margin: 1 });
    if (firstSmallerText >= 0) {
      expect(firstSmallerText).toBeGreaterThan(firstNarrowerMargin);
      expect(steps[firstSmallerText - 1]).toEqual({ ...bounds, text: 1 });
    }
  });

  it.each(TEMPLATE_IDS)("only ever tightens %s, and never past its bounds", (template) => {
    const steps = fitSteps(template);
    const bounds = FIT_BOUNDS[template];
    for (const [index, step] of steps.entries()) {
      for (const key of ["space", "leading", "text", "margin"] as const) {
        expect(step[key]).toBeGreaterThanOrEqual(bounds[key]);
        const previous = steps[index - 1];
        if (previous) expect(step[key]).toBeLessThanOrEqual(previous[key]);
      }
    }
  });

  it.each(TEMPLATE_IDS)("keeps %s body text at 9.5 pt and margins at 10 mm or more", (template) => {
    const tightest = buildPdfDocument(sampleProfile(), template, {
      fitStep: FIT_BOUNDS[template],
    });
    const bodyPt = tightest.styles?.body?.fontSize ?? 0;
    expect(bodyPt).toBeGreaterThanOrEqual(MIN_BODY_TEXT_PT - 0.001);
    expect(bodyPt).toBeLessThanOrEqual(MIN_BODY_TEXT_PT + 0.05);
    const margins = tightest.pageMargins as number[];
    for (const margin of margins) {
      expect((margin * 25.4) / 72).toBeGreaterThanOrEqual(MIN_PAGE_MARGIN_MM - 0.01);
    }
    expect(Math.min(...margins)).toBeLessThan(TEMPLATE_METRICS[template].marginPt);
    // The metrics match what the template prints as designed.
    const designed = buildPdfDocument(sampleProfile(), template);
    expect(designed.styles?.body?.fontSize).toBe(TEMPLATE_METRICS[template].bodyPt);
    expect(Math.min(...(designed.pageMargins as number[]))).toBe(
      TEMPLATE_METRICS[template].marginPt
    );
  });

  it("rates each step's density from 0 to 1", () => {
    const steps = fitSteps("modern");
    expect(stepDensity("modern", 0)).toBe(0);
    expect(stepDensity("modern", steps.length - 1)).toBe(1);
    expect(stepDensity("modern", 3)).toBeCloseTo(3 / (steps.length - 1), 3);
  });
});

describe("applyFitStep", () => {
  const doc: TDocumentDefinitions = {
    content: [
      { text: "Title", style: "title", margin: [4, 10, 4, 6] },
      {
        stack: [
          {
            columns: [
              { text: "-", width: 10 },
              { text: "Bullet", fontSize: 10 },
            ],
            columnGap: 6,
            margin: [0, 2, 0, 0],
          },
        ],
        margin: [0, 0, 0, 8],
      },
    ],
    styles: { title: { fontSize: 20, lineHeight: 1.4, margin: [0, 8, 0, 4] } },
    defaultStyle: { fontSize: 10 },
    pageMargins: [45, 45, 45, 45],
  };

  it("leaves the document as it is when untightened", () => {
    expect(applyFitStep(doc, UNTIGHTENED)).toBe(doc);
  });

  it("scales gaps, line heights and font sizes, and nothing horizontal", () => {
    const fitted = applyFitStep(doc, { space: 0.5, leading: 0.9, text: 0.9, margin: 1 });

    expect(fitted.styles?.title).toEqual({ fontSize: 18, lineHeight: 1.26, margin: [0, 4, 0, 2] });
    expect(fitted.defaultStyle).toEqual({ fontSize: 9 });
    expect(fitted.pageMargins).toEqual([45, 45, 45, 45]);
    expect(fitted.content).toEqual([
      { text: "Title", style: "title", margin: [4, 5, 4, 3] },
      {
        stack: [
          {
            columns: [
              { text: "-", width: 10 },
              { text: "Bullet", fontSize: 9 },
            ],
            columnGap: 6,
            margin: [0, 1, 0, 0],
          },
        ],
        margin: [0, 0, 0, 4],
      },
    ]);
  });

  it("never sets lines closer than single spacing", () => {
    const fitted = applyFitStep(
      { content: [], styles: { name: { lineHeight: 1.05 } } },
      { space: 1, leading: 0.8, text: 1, margin: 1 }
    );
    expect(fitted.styles?.name?.lineHeight).toBe(1);
  });

  it("does not change the document it is given", () => {
    const before = structuredClone(doc);
    applyFitStep(doc, { space: 0.5, leading: 0.9, text: 0.9, margin: 1 });
    expect(doc).toEqual(before);
  });
});
