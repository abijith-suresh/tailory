import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "../resume/design.ts";
import { buildResumeRenderModel, loadPdfTemplateRenderer } from "../templates/registry.ts";
import { createTemplateFixture } from "../templates/template-fixtures.ts";
import { RESUME_SECTION_KEYS, type ResumeSectionKey } from "../types/application.ts";
import { normalizeSectionOrder, orderSections } from "./section-order.ts";

const sections = (ids: ResumeSectionKey[]) => ids.map((id) => ({ id }));

describe("normalizeSectionOrder", () => {
  it("lists every section once, in the given order then the default order", () => {
    expect(normalizeSectionOrder(["skills", "summary"])).toEqual([
      "skills",
      "summary",
      ...RESUME_SECTION_KEYS.filter((key) => key !== "skills" && key !== "summary"),
    ]);
  });

  it("gives the default order for anything that isn't a list", () => {
    expect(normalizeSectionOrder(undefined)).toEqual([...RESUME_SECTION_KEYS]);
    expect(normalizeSectionOrder("skills")).toEqual([...RESUME_SECTION_KEYS]);
  });
});

describe("orderSections", () => {
  it("puts sections in the given order", () => {
    const ordered = orderSections(sections(["summary", "work", "skills", "projects"]), [
      "projects",
      "skills",
    ]);

    expect(ordered.map((section) => section.id)).toEqual(["projects", "skills", "summary", "work"]);
  });

  it("keeps the template's order without an order", () => {
    const input = sections(["work", "summary"]);

    expect(orderSections(input).map((section) => section.id)).toEqual(["work", "summary"]);
  });
});

describe("rendering in a given order", () => {
  const resume = createTemplateFixture();

  it("renders exactly as before when no order is given", () => {
    const design = resolveResumeDesignSettings({ template: "modern" });

    expect(buildResumeRenderModel(resume, design, undefined)).toEqual(
      buildResumeRenderModel(resume, design)
    );
  });

  it("reorders sections and keeps the template's rules between them", () => {
    const design = resolveResumeDesignSettings({ template: "compact-ats" });
    const original = buildResumeRenderModel(resume, design);
    const reordered = buildResumeRenderModel(resume, design, ["certificates", "summary"]);

    expect(reordered.sections.map((section) => section.id).slice(0, 2)).toEqual([
      "certificates",
      "summary",
    ]);
    expect(reordered.sections.map((section) => section.dividerAfter)).toEqual(
      original.sections.map((section) => section.dividerAfter)
    );
  });
});

describe("printing in an application's order", () => {
  it.each(["modern", "minimal", "compact-ats"] as const)(
    "puts the %s template's PDF sections in the given order",
    (template) => {
      const resume = createTemplateFixture();
      const firstTitle = (order?: ResumeSectionKey[]) =>
        JSON.stringify(
          loadPdfTemplateRenderer(template)(resume, { sectionOrder: order }).content
        ).match(/"text":"(SUMMARY|(?:TECHNICAL )?SKILLS|[A-Z ]*EXPERIENCE)"/)?.[1];

      expect(firstTitle()).not.toMatch(/SKILLS/);
      expect(firstTitle(["skills", "summary"])).toMatch(/SKILLS$/);
    }
  );
});
