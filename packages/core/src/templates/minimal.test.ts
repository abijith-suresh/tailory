import { describe, expect, it } from "vitest";

import { CONTACT_KEYS, contactProfileKey } from "../applications/items.ts";
import { resolveApplication } from "../applications/resolve.ts";
import { resolveResumeDesignSettings } from "../resume/design.ts";
import { sampleApplication } from "../test/support.ts";
import { buildMinimalRenderModel, minimalTemplate } from "./minimal.ts";
import { createTemplateFixture, createUnicodeTemplateFixture } from "./template-fixtures.ts";

describe("minimalTemplate", () => {
  it("keeps exported contact url and avoids raw bullet glyph text", () => {
    const doc = minimalTemplate(createTemplateFixture());
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain(
      "janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests"
    );
    expect(serialized).not.toContain("\u2022 ");
  });

  it("does not emit dangling auto date columns for missing dates", () => {
    const resume = createTemplateFixture();
    const secondJob = resume.work?.[1];
    resume.work = secondJob ? [{ ...secondJob }] : [];
    const doc = minimalTemplate(resume);
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
    const doc = minimalTemplate(createUnicodeTemplateFixture());
    const serialized = JSON.stringify(doc);

    expect(serialized).toContain("Jose Alvarez");
    expect(serialized).toContain("Chloe Moreau");
    expect(serialized).toContain("bullets");
    expect(serialized).toContain('"font":"Roboto"');
  });

  it("prints basics.url and profile links compactly and clickably in the contact line", () => {
    const resume = createTemplateFixture();
    resume.basics.url = "https://janedoe.dev/";
    resume.basics.profiles = [
      { id: "gh", network: "GitHub", username: "janedoe", url: "https://github.com/janedoe/" },
      {
        id: "li",
        network: "LinkedIn",
        username: "jane-doe",
        url: "https://www.linkedin.com/in/jane-doe/",
      },
    ];

    const model = buildMinimalRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "minimal", accentColor: "#1d6648" })
    );
    expect(model.header.urlLine).toBeUndefined();
    expect(model.header.contactLine).toBe(
      "jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | janedoe.dev | github.com/janedoe | linkedin.com/in/jane-doe"
    );

    const doc = minimalTemplate(resume);
    const headerStack = (doc.content as Array<{ stack?: unknown[] }>)[0]?.stack ?? [];
    expect(headerStack).toHaveLength(3);
    expect(headerStack[2]).toEqual({
      text: [
        "jane.doe.very.long.email@example.dev",
        " | ",
        "+1 (555) 123-4567",
        " | ",
        { text: "janedoe.dev", link: "https://janedoe.dev/" },
        " | ",
        { text: "github.com/janedoe", link: "https://github.com/janedoe/" },
        " | ",
        { text: "linkedin.com/in/jane-doe", link: "https://www.linkedin.com/in/jane-doe/" },
      ],
      style: "contact",
    });
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

    const { resume: withoutLinkedIn } = resolveApplication(
      profile,
      sampleApplication({ excluded: [contactProfileKey("li")] })
    );
    const headerWithoutLinkedIn = JSON.stringify(
      (minimalTemplate(withoutLinkedIn).content as unknown[])[0]
    );

    expect(headerWithoutLinkedIn).toContain("janedoe.dev");
    expect(headerWithoutLinkedIn).toContain("github.com/janedoe-gh");
    expect(headerWithoutLinkedIn).not.toContain("linkedin.com/in/jane-doe");

    const { resume: withoutUrl } = resolveApplication(
      profile,
      sampleApplication({ excluded: [CONTACT_KEYS.url] })
    );
    const headerWithoutUrl = JSON.stringify((minimalTemplate(withoutUrl).content as unknown[])[0]);
    expect(headerWithoutUrl).not.toContain("janedoe.dev");
    expect(headerWithoutUrl).toContain("github.com/janedoe-gh");
  });

  it("renders a profile without links as before", () => {
    const resume = createTemplateFixture();
    resume.basics.url = "";
    resume.basics.profiles = [];

    const doc = minimalTemplate(resume);
    const headerStack = (doc.content as Array<{ stack?: unknown[] }>)[0]?.stack ?? [];
    expect(headerStack).toEqual([
      { text: "Jane Doe", style: "name" },
      { text: "Senior Frontend Engineer", style: "label" },
      {
        text: "jane.doe.very.long.email@example.dev | +1 (555) 123-4567",
        style: "contact",
      },
    ]);
  });
});
