import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";

import { createTemplateFixture, createUnicodeTemplateFixture } from "./template-fixtures";
import { buildMinimalRenderModel, minimalTemplate } from "./minimal";

describe("minimalTemplate", () => {
  it("keeps exported contact url and avoids raw bullet glyph text", () => {
    const doc = minimalTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).not.toContain("\u2022 ");
  });

  it("does not emit dangling auto date columns for missing dates", () => {
    const resume = createTemplateFixture();
    resume.work = [{ ...resume.work![1]! }];
    const doc = minimalTemplate(resume, { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"width":"auto"');
    expect(serialized).not.toContain('"text":" - "');
  });

  it("builds a shared render model that preserves section order", () => {
    const model = buildMinimalRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: "minimal", accentColor: "#1d6648" })
    );

    expect(model.sections.map((section) => section.id)).toEqual([
      "summary",
      "work",
      "education",
      "skills",
      "projects",
      "certificates",
    ]);
  });

  it("keeps unicode and problematic glyph content extractable in the document definition", () => {
    const doc = minimalTemplate(createUnicodeTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("Jose Alvarez");
    expect(serialized).toContain("Chloe Moreau");
    expect(serialized).toContain("bullets");
    expect(serialized).toContain('"font":"Roboto"');
  });
});
