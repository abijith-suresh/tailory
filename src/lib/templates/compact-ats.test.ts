import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";

import { buildCompactAtsRenderModel, compactAtsTemplate } from "./compact-ats";
import { createTemplateFixture } from "./template-fixtures";

describe("compactAtsTemplate", () => {
  it("uses dynamic divider widths and ATS-safe bullets", () => {
    const doc = compactAtsTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
    expect(serialized).toContain('"text":"-"');
  });

  it("keeps long contact information in the document definition", () => {
    const doc = compactAtsTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("jane.doe.very.long.email@example.dev");
    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
  });

  it("builds shared render metadata with compact section dividers", () => {
    const model = buildCompactAtsRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: "compact-ats", accentColor: "#1d6648" })
    );

    expect(model.header.dividerAfter).toBe(true);
    expect(model.sections.filter((section) => section.dividerAfter).length).toBeGreaterThan(0);
  });
});
