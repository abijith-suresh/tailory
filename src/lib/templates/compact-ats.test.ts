import { describe, expect, it } from "vitest";

import { compactAtsTemplate } from "./compact-ats";
import { createTemplateFixture } from "./template-fixtures";

describe("compactAtsTemplate", () => {
  it("uses dynamic divider widths and ATS-safe bullets", () => {
    const doc = compactAtsTemplate(createTemplateFixture(), { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
    expect(serialized).toContain('"text":"-"');
  });

  it("keeps long contact information in the document definition", () => {
    const doc = compactAtsTemplate(createTemplateFixture(), { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("jane.doe.very.long.email@example.dev");
    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
  });
});
