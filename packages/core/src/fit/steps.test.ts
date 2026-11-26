import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { describe, expect, it } from "vitest";
import { TEMPLATE_IDS } from "../types/template.ts";
import { applyFitStep, FIT_BOUNDS, fitSteps, UNTIGHTENED } from "./steps.ts";

describe("fitSteps", () => {
  it.each(TEMPLATE_IDS)("starts untightened and ends at the %s template's bounds", (template) => {
    const steps = fitSteps(template);
    expect(steps[0]).toEqual(UNTIGHTENED);
    expect(steps.at(-1)).toEqual(FIT_BOUNDS[template]);
  });

  it.each(TEMPLATE_IDS)("tightens %s spacing before it makes text smaller", (template) => {
    const steps = fitSteps(template);
    const bounds = FIT_BOUNDS[template];
    const firstSmallerText = steps.findIndex((step) => step.text < 1);

    expect(firstSmallerText).toBeGreaterThan(1);
    // Spacing and line height are at their tightest before text changes at all.
    expect(steps[firstSmallerText - 1]).toEqual({
      space: bounds.space,
      leading: bounds.leading,
      text: 1,
    });
  });

  it.each(TEMPLATE_IDS)("only ever tightens %s, and never past its bounds", (template) => {
    const steps = fitSteps(template);
    const bounds = FIT_BOUNDS[template];
    for (const [index, step] of steps.entries()) {
      expect(step.space).toBeGreaterThanOrEqual(bounds.space);
      expect(step.leading).toBeGreaterThanOrEqual(bounds.leading);
      expect(step.text).toBeGreaterThanOrEqual(bounds.text);
      const previous = steps[index - 1];
      if (previous) {
        expect(step.space).toBeLessThanOrEqual(previous.space);
        expect(step.leading).toBeLessThanOrEqual(previous.leading);
        expect(step.text).toBeLessThanOrEqual(previous.text);
      }
    }
  });

  it("keeps text readable at every template's tightest", () => {
    for (const template of TEMPLATE_IDS) {
      expect(FIT_BOUNDS[template].text).toBeGreaterThanOrEqual(0.9);
      expect(FIT_BOUNDS[template].space).toBeGreaterThanOrEqual(0.6);
    }
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
    const fitted = applyFitStep(doc, { space: 0.5, leading: 0.9, text: 0.9 });

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
      { space: 1, leading: 0.8, text: 1 }
    );
    expect(fitted.styles?.name?.lineHeight).toBe(1);
  });

  it("does not change the document it is given", () => {
    const before = structuredClone(doc);
    applyFitStep(doc, { space: 0.5, leading: 0.9, text: 0.9 });
    expect(doc).toEqual(before);
  });
});
