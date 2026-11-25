import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "../resume/design.ts";
import { TEMPLATE_IDS } from "../types/template.ts";
import { loadPdfTemplateRenderer, TEMPLATE_OPTIONS, TEMPLATE_REGISTRY } from "./registry.ts";
import { createTemplateFixture } from "./template-fixtures.ts";

describe("template registry", () => {
  it("keeps template option order aligned with supported ids", () => {
    expect(TEMPLATE_OPTIONS.map((template) => template.id)).toEqual(TEMPLATE_IDS);
  });

  it.each(TEMPLATE_IDS)("loads a pdf renderer for %s", (templateId) => {
    expect(loadPdfTemplateRenderer(templateId)).toEqual(expect.any(Function));
    expect(TEMPLATE_REGISTRY[templateId].label.length).toBeGreaterThan(0);
  });

  it.each(TEMPLATE_IDS)("builds a shared render model for %s", (templateId) => {
    const model = TEMPLATE_REGISTRY[templateId].buildRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: templateId, accentColor: "#1d6648" })
    );

    expect(model.template).toBe(templateId);
    expect(model.sections.length).toBeGreaterThan(0);
  });
});
