import { describe, expect, it } from "vitest";

import { resolveResumeDesignSettings } from "@/lib/resume/design";
import { buildModernRenderModel, modernTemplate } from "./modern";
import { createTemplateFixture } from "./template-fixtures";

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

  it("includes supplemental schema-backed sections in the shared model", () => {
    const resume = createTemplateFixture();
    resume.volunteer = [{ id: "vol-1", organization: "Code Club", position: "Mentor" }];
    resume.awards = [{ id: "award-1", title: "Builder Award", awarder: "Acme", date: "2024" }];
    resume.publications = [
      {
        id: "pub-1",
        name: "Resume Imports",
        publisher: "Frontend Weekly",
        url: "https://example.com/imports",
      },
    ];
    resume.languages = [{ id: "lang-1", language: "English", fluency: "Native" }];
    resume.interests = [{ id: "interest-1", name: "Mentoring", keywords: ["community"] }];
    resume.references = [{ id: "ref-1", name: "Alex Smith", reference: "Available on request" }];

    const model = buildModernRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "modern", accentColor: "#1d6648" })
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
    expect(
      model.sections.find((section) => section.id === "publications")?.entries?.[0]?.link
    ).toBe("example.com/imports");
  });
});
