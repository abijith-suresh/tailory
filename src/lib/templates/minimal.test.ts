import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";
import { buildMinimalRenderModel, minimalTemplate } from "./minimal";
import { createTemplateFixture, createUnicodeTemplateFixture } from "./template-fixtures";

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
    resume.work = [{ ...resume.work?.[1]! }];
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

  it("renders supplemental schema-backed sections in the shared model", () => {
    const resume = createTemplateFixture();
    resume.volunteer = [{ id: "vol-1", organization: "Code Club", position: "Mentor" }];
    resume.awards = [{ id: "award-1", title: "Builder Award", awarder: "Acme", date: "2024" }];
    resume.publications = [{ id: "pub-1", name: "Resume Imports", publisher: "Frontend Weekly" }];
    resume.languages = [{ id: "lang-1", language: "English", fluency: "Native" }];
    resume.interests = [{ id: "interest-1", name: "Mentoring", keywords: ["community"] }];
    resume.references = [{ id: "ref-1", name: "Alex Smith", reference: "Available on request" }];

    const model = buildMinimalRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "minimal", accentColor: "#1d6648" })
    );

    expect(model.sections.map((section) => section.id)).toEqual([
      "summary",
      "work",
      "volunteer",
      "education",
      "awards",
      "publications",
      "skills",
      "languages",
      "interests",
      "projects",
      "references",
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
