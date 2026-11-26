import { EMPTY_RESUME, type FitResult, ResumeExportValidationError } from "@tailory/core";
import {
  countPdfPages,
  longResume,
  sampleApplication,
  sampleProfile,
  veryLongResume,
} from "@tailory/core/testing/support";
import { describe, expect, it } from "vitest";

import {
  describeFit,
  fitApplicationResult,
  fitProfileResult,
  loadPdfMake,
  renderJsonResume,
  renderPdf,
} from "./render";

const modern = (overrides: Parameters<typeof sampleApplication>[0] = {}) =>
  sampleApplication({ templateId: "modern", ...overrides });

describe("fitApplicationResult", () => {
  it("reports the page count the printed PDF has", async () => {
    for (const [profile, pageTarget, autoFit] of [
      [sampleProfile(), 1, true],
      [longResume(), null, true],
      [longResume(), 2, true],
      [longResume(), 1, true],
      [longResume(), 1, false],
      [veryLongResume(), 1, true],
    ] as const) {
      const application = modern({ pageTarget, autoFit });
      const fitted = await fitApplicationResult(profile, application);
      const pdf = await renderPdf(profile, application);
      expect(countPdfPages(pdf)).toBe(fitted.page.pageCount);
    }
  });

  it("says a short resume fits", async () => {
    const fitted = await fitApplicationResult(sampleProfile(), modern({ pageTarget: 1 }));
    expect(fitted.page).toEqual({
      pageCount: 1,
      pageTarget: 1,
      fits: true,
      tightened: false,
      linesOver: 0,
      message: "1 page, fits",
    });
  });

  it("reports how far a resume too long for its target runs over", async () => {
    const fitted = await fitApplicationResult(veryLongResume(), modern({ pageTarget: 1 }));
    expect(fitted.page.fits).toBe(false);
    expect(fitted.page.pageCount).toBeGreaterThan(1);
    expect(fitted.page.linesOver).toBeGreaterThan(0);
    expect(fitted.page.message).toBe(
      `about ${fitted.page.linesOver} lines over 1 page, even with the tightest spacing`
    );
  });

  it("tightens to meet the target only when allowed", async () => {
    const off = await fitApplicationResult(longResume(), modern({ autoFit: false }));
    expect(off.page).toMatchObject({ pageCount: 2, fits: false, tightened: false });
    expect(off.page.message).toMatch(/^about \d+ lines? over 1 page; tightening is off$/);

    const on = await fitApplicationResult(longResume(), modern({ autoFit: true }));
    expect(on.page).toMatchObject({ pageCount: 1, fits: true, tightened: true, linesOver: 0 });
    expect(on.page.message).toBe("1 page, fits with tighter spacing");
    expect(on.fit.stepIndex).toBeGreaterThan(0);
    expect(countPdfPages(await renderPdf(longResume(), modern({ autoFit: true })))).toBe(1);
  });

  it("prints the application's resume, not the whole profile", async () => {
    const application = modern({ excluded: ["work-b"] });
    const fitted = await fitApplicationResult(sampleProfile(), application);
    expect(fitted.resume.work?.map((entry) => entry.id)).toEqual(["work-a"]);
    expect(fitted.template).toBe("modern");
  });
});

describe("fitProfileResult", () => {
  it("counts pages without a target", async () => {
    const fitted = await fitProfileResult(longResume());
    expect(fitted.page).toMatchObject({ pageCount: 2, pageTarget: null, fits: true });
    expect(fitted.page.message).toBe("2 pages");
    expect(countPdfPages(await renderPdf(longResume(), null))).toBe(2);
  });

  it("fits to a target the caller gives", async () => {
    const fitted = await fitProfileResult(longResume(), { pageTarget: 1, autoFit: true });
    expect(fitted.page).toMatchObject({ pageCount: 1, tightened: true });
    const pdf = await renderPdf(longResume(), null, { pageTarget: 1, autoFit: true });
    expect(countPdfPages(pdf)).toBe(1);
  });
});

describe("describeFit", () => {
  const result = (overrides: Partial<FitResult>) =>
    ({ status: "over", pageCount: 2, pageTarget: 1, linesOver: 1, ...overrides }) as FitResult;

  it("names one line and one page in the singular", () => {
    expect(describeFit(result({}), true)).toBe(
      "about 1 line over 1 page, even with the tightest spacing"
    );
    expect(describeFit(result({ status: "none", pageCount: 1 }), true)).toBe("1 page");
  });

  it("counts past a target of several pages", () => {
    expect(describeFit(result({ pageCount: 3, pageTarget: 2, linesOver: 12 }), false)).toBe(
      "about 12 lines over 2 pages; tightening is off"
    );
  });
});

describe("renderPdf", () => {
  it("prints a PDF", async () => {
    const pdf = await renderPdf(sampleProfile(), modern());
    expect(new TextDecoder().decode(pdf.subarray(0, 5))).toBe("%PDF-");
  });

  it("refuses a resume with nothing to print", async () => {
    await expect(renderPdf(structuredClone(EMPTY_RESUME), null)).rejects.toBeInstanceOf(
      ResumeExportValidationError
    );
  });

  it("loads pdfmake once", async () => {
    expect(await loadPdfMake()).toBe(await loadPdfMake());
  });
});

describe("renderJsonResume", () => {
  it("exports the application's resume", () => {
    const document = renderJsonResume(sampleProfile(), modern({ excluded: ["bullet-a1"] }));
    expect(document.work).toEqual([
      expect.objectContaining({ name: "Fieldnote", highlights: ["Built the design system"] }),
      expect.objectContaining({ name: "Northwind" }),
    ]);
  });

  it("exports the whole profile without an application", () => {
    const document = renderJsonResume(sampleProfile(), null);
    expect((document.basics as { name: string }).name).toBe("Jane Doe");
    expect(document.work).toHaveLength(2);
  });
});
