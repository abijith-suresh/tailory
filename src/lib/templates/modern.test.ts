import { describe, expect, it } from "vitest";

import { createTemplateFixture } from "./template-fixtures";
import { modernTemplate } from "./modern";

describe("modernTemplate", () => {
  it("uses dynamic divider widths and avoids raw bullet glyph text", () => {
    const doc = modernTemplate(createTemplateFixture(), { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
  });

  it("keeps url and section content in the document definition", () => {
    const doc = modernTemplate(createTemplateFixture(), { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).toContain("SUMMARY");
    expect(serialized).toContain("PROJECTS");
    expect(serialized).toContain("CERTIFICATIONS");
  });
});
