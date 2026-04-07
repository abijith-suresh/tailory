import { describe, expect, it } from "vitest";

import { loadPdfTemplateRenderer, TEMPLATE_OPTIONS, TEMPLATE_REGISTRY } from "./registry";
import { isTemplateId, TEMPLATE_IDS } from "@/types/template";

describe("template registry", () => {
  it("keeps template option order aligned with supported ids", () => {
    expect(TEMPLATE_OPTIONS.map((template) => template.id)).toEqual(TEMPLATE_IDS);
  });

  it.each(TEMPLATE_IDS)("loads a pdf renderer for %s", async (templateId) => {
    await expect(loadPdfTemplateRenderer(templateId)).resolves.toEqual(expect.any(Function));
    expect(TEMPLATE_REGISTRY[templateId].label.length).toBeGreaterThan(0);
  });

  it("validates template ids", () => {
    expect(isTemplateId("modern")).toBe(true);
    expect(isTemplateId("bogus")).toBe(false);
  });
});
