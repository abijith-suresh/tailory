import { describe, expect, it } from "vitest";

import { CONTACT_KEYS, contactProfileKey } from "../applications/items.ts";
import { resolveApplication } from "../applications/resolve.ts";
import { resolveResumeDesignSettings } from "../resume/design.ts";
import { loadTestPdfMake, sampleApplication } from "../test/support.ts";
import { buildModernRenderModel, modernTemplate } from "./modern.ts";
import { createTemplateFixture } from "./template-fixtures.ts";

describe("modernTemplate", () => {
  it("uses dynamic divider widths and avoids raw bullet glyph text", () => {
    const doc = modernTemplate(createTemplateFixture());
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
  });

  it("keeps url and section content in the document definition", () => {
    const doc = modernTemplate(createTemplateFixture());
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).toContain("SUMMARY");
    expect(serialized).toContain("PROJECTS");
    expect(serialized).toContain("CERTIFICATIONS");
  });

  it("propagates accent color and uses a fixed A4 page", () => {
    const doc = modernTemplate(createTemplateFixture(), { accentColor: "#2563eb" });

    expect(doc.styles?.sectionTitle).toMatchObject({ color: "#2563eb" });
    expect(doc.pageSize).toBe("A4");
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

  it("prints basics.url and profile links compactly and clickably in the contact line", async () => {
    const resume = createTemplateFixture();
    resume.basics.url = "https://www.janedoe.dev/";
    resume.basics.profiles = [
      { id: "gh", network: "GitHub", username: "janedoe", url: "https://github.com/janedoe/" },
      {
        id: "li",
        network: "LinkedIn",
        username: "jane-doe",
        url: "https://www.linkedin.com/in/jane-doe/",
      },
      { id: "site", network: "Website", username: "", url: "blog.janedoe.dev" },
    ];

    const model = buildModernRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "modern", accentColor: "#1d6648" })
    );
    expect(model.header.urlLine).toBeUndefined();
    expect(model.header.contactLine).toBe(
      "jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | San Francisco, CA | janedoe.dev | github.com/janedoe | linkedin.com/in/jane-doe | blog.janedoe.dev"
    );
    expect(model.header.contactItems).toEqual([
      { text: "jane.doe.very.long.email@example.dev" },
      { text: "+1 (555) 123-4567" },
      { text: "San Francisco, CA" },
      { text: "janedoe.dev", link: "https://www.janedoe.dev/" },
      { text: "github.com/janedoe", link: "https://github.com/janedoe/" },
      { text: "linkedin.com/in/jane-doe", link: "https://www.linkedin.com/in/jane-doe/" },
      { text: "blog.janedoe.dev", link: "https://blog.janedoe.dev" },
    ]);

    const doc = modernTemplate(resume);
    const headerStack = (doc.content as Array<{ stack?: unknown[] }>)[0]?.stack ?? [];
    expect(headerStack).toHaveLength(3);
    expect(headerStack[2]).toEqual({
      text: [
        "jane.doe.very.long.email@example.dev",
        " | ",
        "+1 (555) 123-4567",
        " | ",
        "San Francisco, CA",
        " | ",
        { text: "janedoe.dev", link: "https://www.janedoe.dev/" },
        " | ",
        { text: "github.com/janedoe", link: "https://github.com/janedoe/" },
        " | ",
        { text: "linkedin.com/in/jane-doe", link: "https://www.linkedin.com/in/jane-doe/" },
        " | ",
        { text: "blog.janedoe.dev", link: "https://blog.janedoe.dev" },
      ],
      style: "contactLine",
    });

    const pdfMake = await loadTestPdfMake();
    const pdfBytes = await pdfMake.createPdf(doc).getBuffer();
    const pdfText = new TextDecoder("latin1").decode(pdfBytes);
    expect(pdfText).toContain("/Subtype /Link");
    expect(pdfText).toContain("/URI (https://github.com/janedoe/)");
    expect(pdfText).toContain("/URI (https://www.janedoe.dev/)");
  });

  it("omits left-out profile links and basics.url when resolved for an application", () => {
    const profile = createTemplateFixture();
    profile.basics.url = "https://janedoe.dev/";
    profile.basics.profiles = [
      { id: "gh", network: "GitHub", username: "janedoe-gh", url: "https://github.com/janedoe-gh" },
      {
        id: "li",
        network: "LinkedIn",
        username: "jane-doe",
        url: "https://linkedin.com/in/jane-doe",
      },
    ];

    const { resume: withoutGithub } = resolveApplication(
      profile,
      sampleApplication({ excluded: [contactProfileKey("gh"), CONTACT_KEYS.url] })
    );
    const doc = modernTemplate(withoutGithub);
    const headerSerialized = JSON.stringify((doc.content as unknown[])[0]);

    expect(headerSerialized).toContain("linkedin.com/in/jane-doe");
    expect(headerSerialized).not.toContain("github.com/janedoe-gh");
    expect(headerSerialized).not.toContain("janedoe.dev");
  });

  it("renders a profile without links as before", () => {
    const resume = createTemplateFixture();
    resume.basics.url = "";
    resume.basics.profiles = [];

    const model = buildModernRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "modern", accentColor: "#1d6648" })
    );
    expect(model.header).toEqual({
      name: "Jane Doe",
      label: "Senior Frontend Engineer",
      contactItems: [
        { text: "jane.doe.very.long.email@example.dev" },
        { text: "+1 (555) 123-4567" },
        { text: "San Francisco, CA" },
      ],
      contactLine: "jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | San Francisco, CA",
    });

    const doc = modernTemplate(resume);
    const headerStack = (doc.content as Array<{ stack?: unknown[] }>)[0]?.stack ?? [];
    expect(headerStack).toEqual([
      { text: "Jane Doe", style: "name" },
      { text: "Senior Frontend Engineer", style: "label" },
      {
        text: "jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | San Francisco, CA",
        style: "contactLine",
      },
    ]);
  });
});
