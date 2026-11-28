import { describe, expect, it } from "vitest";

import { CONTACT_KEYS, contactProfileKey } from "../applications/items.ts";
import { resolveApplication } from "../applications/resolve.ts";
import { resolveResumeDesignSettings } from "../resume/design.ts";
import { sampleApplication } from "../test/support.ts";

import { buildCompactAtsRenderModel, compactAtsTemplate } from "./compact-ats.ts";
import { createTemplateFixture } from "./template-fixtures.ts";

describe("compactAtsTemplate", () => {
  it("uses dynamic divider widths and ATS-safe bullets", () => {
    const doc = compactAtsTemplate(createTemplateFixture());
    const serialized = JSON.stringify(doc);

    expect(serialized).not.toContain('"x2":515');
    expect(serialized).not.toContain("\u2022 ");
    expect(serialized).toContain('"text":"-"');
  });

  it("keeps long contact information in the document definition", () => {
    const doc = compactAtsTemplate(createTemplateFixture());
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

  it("includes supplemental schema-backed sections in the ATS model", () => {
    const resume = createTemplateFixture();
    resume.volunteer = [{ id: "vol-1", organization: "Code Club", position: "Mentor" }];
    resume.awards = [{ id: "award-1", title: "Builder Award", awarder: "Acme", date: "2024" }];
    resume.publications = [{ id: "pub-1", name: "Resume Imports", publisher: "Frontend Weekly" }];
    resume.languages = [{ id: "lang-1", language: "English", fluency: "Native" }];
    resume.interests = [{ id: "interest-1", name: "Mentoring", keywords: ["community"] }];
    resume.references = [{ id: "ref-1", name: "Alex Smith", reference: "Available on request" }];

    const model = buildCompactAtsRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "compact-ats", accentColor: "#1d6648" })
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

  it("prints basics.url and profile links compactly and clickably in the contact line", () => {
    const resume = createTemplateFixture();
    resume.basics.url = "https://janedoe.dev/";
    resume.basics.profiles = [
      { id: "gh", network: "GitHub", username: "janedoe", url: "https://github.com/janedoe/" },
      { id: "site", network: "Blog", username: "", url: "https://www.blog.janedoe.dev/" },
    ];

    const model = buildCompactAtsRenderModel(
      resume,
      resolveResumeDesignSettings({ template: "compact-ats", accentColor: "#1d6648" })
    );
    expect(model.header.contactLine).toBe(
      "Senior Frontend Engineer | jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | San Francisco, CA | janedoe.dev | github.com/janedoe | blog.janedoe.dev"
    );

    const doc = compactAtsTemplate(resume);
    const content = doc.content as unknown[];
    expect(content[1]).toEqual({
      text: [
        "Senior Frontend Engineer",
        " | ",
        "jane.doe.very.long.email@example.dev",
        " | ",
        "+1 (555) 123-4567",
        " | ",
        "San Francisco, CA",
        " | ",
        { text: "janedoe.dev", link: "https://janedoe.dev/" },
        " | ",
        { text: "github.com/janedoe", link: "https://github.com/janedoe/" },
        " | ",
        { text: "blog.janedoe.dev", link: "https://www.blog.janedoe.dev/" },
      ],
      style: "contact",
      margin: [0, 1, 0, 8],
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

    const { resume } = resolveApplication(
      profile,
      sampleApplication({ excluded: [contactProfileKey("gh"), CONTACT_KEYS.url] })
    );
    const headerSerialized = JSON.stringify((compactAtsTemplate(resume).content as unknown[])[1]);

    expect(headerSerialized).toContain("linkedin.com/in/jane-doe");
    expect(headerSerialized).not.toContain("github.com/janedoe-gh");
    expect(headerSerialized).not.toContain("janedoe.dev");
  });

  it("renders a profile without links as before", () => {
    const resume = createTemplateFixture();
    resume.basics.url = "";
    resume.basics.profiles = [];

    const doc = compactAtsTemplate(resume);
    const content = doc.content as unknown[];
    expect(content[0]).toEqual({ text: "Jane Doe", style: "name" });
    expect(content[1]).toEqual({
      text: "Senior Frontend Engineer | jane.doe.very.long.email@example.dev | +1 (555) 123-4567 | San Francisco, CA",
      style: "contact",
      margin: [0, 1, 0, 8],
    });
  });
});
