import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";

import { buildClassicRenderModel, classicTemplate } from "./classic";
import { createTemplateFixture } from "./template-fixtures";

describe("classicTemplate", () => {
  it("creates a conservative render model with classic section ordering", () => {
    const model = buildClassicRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: "classic", accentColor: "#1d6648" })
    );

    expect(model.sections.map((section) => section.id)).toEqual([
      "summary",
      "work",
      "education",
      "certificates",
      "skills",
      "projects",
    ]);
  });

  it("emits a valid document definition", () => {
    const doc = classicTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("PROFESSIONAL EXPERIENCE");
    expect(serialized).toContain("SELECTED PROJECTS");
  });
});
