import { describe, expect, it } from "vitest";

import { createTemplateFixture } from "./template-fixtures";
import { minimalTemplate } from "./minimal";

describe("minimalTemplate", () => {
  it("keeps exported contact url and avoids raw bullet glyph text", () => {
    const doc = minimalTemplate(createTemplateFixture(), { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).not.toContain("\u2022 ");
  });

  it("does not emit dangling auto date columns for missing dates", () => {
    const resume = createTemplateFixture();
    resume.work = [{ ...resume.work![1]! }];
    const doc = minimalTemplate(resume, { fontFamily: "Helvetica" });
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"width":"auto"');
    expect(serialized).not.toContain('"text":" - "');
  });
});
