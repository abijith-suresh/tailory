import { describe, expect, it } from "vitest";

import { renderPdfResumeModel } from "../export/pdf-renderer.ts";
import {
  buildHeaderContact,
  formatContactLine,
  formatDisplayUrl,
} from "../export/template-helpers.ts";
import { resolveResumeDesignSettings } from "../resume/design.ts";
import { EMPTY_RESUME } from "../types/resume.ts";
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

  it("handles contact link edge cases across helpers and templates", () => {
    expect(formatDisplayUrl("   ")).toBeUndefined();

    const basics = {
      ...structuredClone(EMPTY_RESUME.basics),
      name: "Jane Doe",
      email: "jane@example.com",
      url: "javascript:alert(1)",
      profiles: [
        { id: "p-handle", network: "X", username: "janedoe", url: "" },
        { id: "p-empty", network: "", username: "", url: "" },
        { id: "p-bad", network: "Site", username: "", url: "http://[invalid" },
      ],
    };

    expect(
      formatContactLine(basics, { includeProfiles: true, includeUrl: true, separator: " • " })
    ).toBe("jane@example.com • javascript:alert(1) • X: janedoe • [invalid");

    expect(buildHeaderContact({ name: "Jane Doe" })).toEqual({});

    const header = buildHeaderContact(basics, {
      includeProfiles: true,
      includeUrl: true,
      separator: " • ",
    });
    expect(header.contactItems).toEqual([
      { text: "jane@example.com" },
      { text: "javascript:alert(1)" },
      { text: "X: janedoe" },
      { text: "[invalid" },
    ]);

    const emptyDoc = renderPdfResumeModel({
      template: "compact-ats",
      design: resolveResumeDesignSettings({ template: "compact-ats" }),
      pageMargins: [36, 36, 36, 36],
      header: { name: "Jane Doe" },
      sections: [],
    });
    expect(emptyDoc.content).toEqual([{ text: "Jane Doe", style: "name" }]);

    const legacyModern = renderPdfResumeModel({
      template: "modern",
      design: resolveResumeDesignSettings({ template: "modern" }),
      pageMargins: [45, 45, 45, 45],
      header: { name: "Jane Doe", contactLine: "jane@example.com", urlLine: "janedoe.dev" },
      sections: [],
    });
    expect(JSON.stringify(legacyModern.content)).toContain("janedoe.dev");
  });
});
