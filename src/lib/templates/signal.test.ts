import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";

import { buildSignalRenderModel, signalTemplate } from "./signal";
import { createTemplateFixture } from "./template-fixtures";

describe("signalTemplate", () => {
  it("creates a differentiated render model with skills and projects up front", () => {
    const model = buildSignalRenderModel(
      createTemplateFixture(),
      resolveResumeDesignSettings({ template: "signal", accentColor: "#1d6648" })
    );

    expect(model.sections.map((section) => section.id)).toEqual([
      "skills",
      "summary",
      "work",
      "projects",
      "education",
      "certificates",
    ]);
  });

  it("emits a valid document definition", () => {
    const doc = signalTemplate(createTemplateFixture(), { fontFamily: "Roboto" });
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("CORE SKILLS");
    expect(serialized).toContain("SELECTED PROJECTS");
  });
});
