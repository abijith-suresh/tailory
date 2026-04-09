import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";

import { createTemplateFixture } from "./template-fixtures";
import { buildModernRenderModel, modernTemplate } from "./modern";

describe("modernTemplate", () => {
  it("uses dynamic divider widths and avoids raw bullet glyph text", () => {
    const doc = modernTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
  });

  it("keeps url and section content in the document definition", () => {
    const doc = modernTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).toContain("SUMMARY");
    expect(serialized).toContain("PROJECTS");
    expect(serialized).toContain("CERTIFICATIONS");
  });

  it("propagates accent color and page format from the shared design settings", () => {
    const doc = modernTemplate(createTemplateFixture(), {
      accentColor: "#2563eb",
      fontFamily: "Roboto",
      pageFormat: "Letter",
    });

    expect(doc.styles?.sectionTitle).toMatchObject({ color: "#2563eb" });
    expect(doc.pageSize).toBe("LETTER");
  });

  it("builds a shared render model for preview and export parity", () => {
    const model = buildModernRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: "modern", accentColor: "#1d6648" })
    );

    expect(model.header.contactLine).toContain("jane.doe.very.long.email@example.dev");
    expect(
      model.sections.find((section) => section.id === "projects")?.entries?.[0]?.link
    ).toContain("github.com/janedoe/template-export-hardening-suite");
  });
});
