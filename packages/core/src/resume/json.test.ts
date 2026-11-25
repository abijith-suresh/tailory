import { describe, expect, it } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "../types/resume.ts";

import {
  exportJsonResumeDocument,
  exportJsonResumeString,
  parseJsonResumeDocument,
  parseJsonResumeImport,
  parseJsonResumeString,
} from "./json.ts";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function createResume(overrides?: DeepPartial<ResumeSchema>): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    ...overrides,
    basics: {
      ...structuredClone(EMPTY_RESUME.basics),
      ...overrides?.basics,
      location: {
        ...structuredClone(EMPTY_RESUME.basics.location ?? {}),
        ...overrides?.basics?.location,
      },
    },
  };
}

describe("JSON Resume parsing", () => {
  it("parses and normalizes a valid JSON Resume document", () => {
    const parsed = parseJsonResumeDocument({
      basics: {
        name: "  Jane Doe  ",
        email: "jane@example.com",
        url: "janedoe.dev",
        location: { city: " New York ", countryCode: "us" },
      },
      work: [
        {
          name: " Acme Corp ",
          position: " Senior Engineer ",
          highlights: [" Led launch ", ""],
        },
      ],
      interests: [{ name: " Hiking ", keywords: [" trail running ", ""] }],
      references: [{ name: "  Alex Smith  ", reference: "  Available on request.  " }],
      skills: [{ name: " TypeScript ", keywords: [" testing ", ""] }],
    });

    expect(parsed.basics).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      url: "https://janedoe.dev",
      location: { city: "New York", countryCode: "US" },
    });
    expect(parsed.work?.[0]).toMatchObject({
      name: "Acme Corp",
      position: "Senior Engineer",
      highlights: ["Led launch"],
    });
    expect(parsed.work?.[0]?.id).toBeTruthy();
    expect(parsed.interests?.[0]).toMatchObject({
      name: "Hiking",
      keywords: ["trail running"],
    });
    expect(parsed.references?.[0]).toMatchObject({
      name: "Alex Smith",
      reference: "Available on request.",
    });
    expect(parsed.skills?.[0]).toMatchObject({
      name: "TypeScript",
      keywords: ["testing"],
    });
  });

  it("rejects malformed JSON strings", () => {
    expect(() => parseJsonResumeString("{")).toThrowError(
      "Invalid JSON file. Please upload a valid JSON Resume document."
    );
  });

  it("rejects invalid top-level section shapes", () => {
    expect(() =>
      parseJsonResumeDocument({
        basics: { name: "Jane Doe" },
        work: {},
      })
    ).toThrowError("Invalid JSON Resume: 'work' must be an array.");
  });

  it("imports a document with $schema and meta and reports them as ignored", () => {
    const { resume, ignoredFields } = parseJsonResumeImport(
      JSON.stringify({
        $schema: "https://jsonresume.org/schema",
        meta: { theme: "kendall" },
        basics: { name: "Jane Doe", email: "jane@example.com" },
        skills: [{ name: "TypeScript" }],
      })
    );

    expect(resume.basics).toMatchObject({ name: "Jane Doe", email: "jane@example.com" });
    expect(resume.skills).toHaveLength(1);
    expect(ignoredFields).toEqual(["$schema", "meta"]);
  });

  it("imports a document with an unknown custom key and reports it as ignored", () => {
    const { resume, ignoredFields } = parseJsonResumeImport(
      JSON.stringify({
        basics: { name: "Jane Doe" },
        portfolio: { website: "https://janedoe.dev" },
        custom: 1,
      })
    );

    expect(resume.basics.name).toBe("Jane Doe");
    expect(resume).not.toHaveProperty("portfolio");
    expect(resume).not.toHaveProperty("custom");
    expect(ignoredFields).toEqual(["portfolio", "custom"]);
  });

  it("reports no ignored fields for a document with only supported sections", () => {
    const { ignoredFields } = parseJsonResumeImport(
      JSON.stringify({ basics: { name: "Jane Doe" }, work: [] })
    );

    expect(ignoredFields).toEqual([]);
  });

  it("reports no ignored fields when re-importing Tailory's own export", () => {
    const source = createResume({
      basics: { name: "Jane Doe", label: "Engineer", email: "jane@example.com" },
      work: [{ id: "work-1", name: "Acme", position: "Engineer" }],
      skills: [{ id: "skill-1", name: "TypeScript", keywords: ["web"] }],
    });

    const { resume, ignoredFields } = parseJsonResumeImport(exportJsonResumeString(source));

    expect(ignoredFields).toEqual([]);
    expect(resume.basics.name).toBe("Jane Doe");
  });

  it("still rejects documents that are not JSON objects", () => {
    for (const source of ["[]", '"text"', "42", "null"]) {
      expect(() => parseJsonResumeImport(source)).toThrowError(
        "Invalid JSON Resume: top-level document must be an object."
      );
    }
  });

  it("still rejects wrongly typed known sections when unknown fields are present", () => {
    expect(() =>
      parseJsonResumeImport(
        JSON.stringify({ meta: {}, custom: true, basics: { name: "Jane Doe" }, skills: "none" })
      )
    ).toThrowError("Invalid JSON Resume: 'skills' must be an array.");
    expect(() => parseJsonResumeImport(JSON.stringify({ basics: "Jane Doe" }))).toThrowError(
      "Invalid JSON Resume: 'basics' must be an object."
    );
  });

  it("rejects documents without basic identity fields", () => {
    expect(() =>
      parseJsonResumeDocument({
        basics: {},
        skills: [{ name: "TypeScript" }],
      })
    ).toThrowError(
      "Invalid JSON Resume: add at least basic identity fields like name, email, or label."
    );
  });
});

describe("JSON Resume export", () => {
  it("exports normalized content without internal ids", () => {
    const exported = exportJsonResumeDocument(
      createResume({
        basics: {
          name: "  Jane Doe  ",
          url: "janedoe.dev",
          location: { city: " New York ", region: " NY " },
        },
        work: [
          {
            id: "work-1",
            name: " Acme Corp ",
            position: " Senior Engineer ",
            highlights: [" Led launch "],
          },
        ],
        interests: [{ id: "interest-1", name: " Hiking ", keywords: [" trail running "] }],
        references: [
          { id: "reference-1", name: " Alex Smith ", reference: " Available on request. " },
        ],
        skills: [{ id: "skill-1", name: " TypeScript ", keywords: [" testing "] }],
      })
    );

    expect(exported).toMatchObject({
      basics: {
        name: "Jane Doe",
        url: "https://janedoe.dev",
        location: { city: "New York", region: "NY" },
      },
      work: [
        {
          name: "Acme Corp",
          position: "Senior Engineer",
          highlights: ["Led launch"],
        },
      ],
      interests: [{ name: "Hiking", keywords: ["trail running"] }],
      references: [{ name: "Alex Smith", reference: "Available on request." }],
      skills: [{ name: "TypeScript", keywords: ["testing"] }],
    });
    expect(JSON.stringify(exported)).not.toContain('"id"');
  });

  it("round-trips exported JSON back into the internal schema", () => {
    const source = createResume({
      basics: {
        name: "Jane Doe",
        label: "Senior Engineer",
        email: "jane@example.com",
      },
      interests: [{ id: "interest-1", name: "Mentoring", keywords: ["community"] }],
      projects: [{ id: "project-1", name: "Portfolio", url: "janedoe.dev" }],
      references: [{ id: "reference-1", name: "Alex Smith", reference: "Available on request" }],
    });

    const roundTripped = parseJsonResumeString(exportJsonResumeString(source));

    expect(roundTripped.basics).toMatchObject({
      name: "Jane Doe",
      label: "Senior Engineer",
      email: "jane@example.com",
    });
    expect(roundTripped.interests?.[0]).toMatchObject({
      name: "Mentoring",
      keywords: ["community"],
    });
    expect(roundTripped.projects?.[0]).toMatchObject({
      name: "Portfolio",
      url: "https://janedoe.dev",
    });
    expect(roundTripped.projects?.[0]?.id).toBeTruthy();
    expect(roundTripped.references?.[0]).toMatchObject({
      name: "Alex Smith",
      reference: "Available on request",
    });
  });

  it.each([
    ["Jan 2020", "2020-01"],
    ["January 2020", "2020-01"],
    ["Sept. 2020", "2020-09"],
    ["Dec, 2019", "2019-12"],
    ["03/2021", "2021-03"],
    ["3/2021", "2021-03"],
    ["2021-03", "2021-03"],
    ["2021-03-15", "2021-03-15"],
    ["2021", "2021"],
  ])("exports the date %j as %j", (stored, expected) => {
    const exported = exportJsonResumeDocument(
      createResume({
        basics: { name: "Jane Doe" },
        work: [{ id: "w1", name: "Acme", position: "Engineer", startDate: stored }],
        awards: [{ id: "a1", title: "Prize", date: stored }],
        publications: [{ id: "p1", name: "Paper", releaseDate: stored }],
      })
    );

    expect(exported.work).toMatchObject([{ startDate: expected }]);
    expect(exported.awards).toMatchObject([{ date: expected }]);
    expect(exported.publications).toMatchObject([{ releaseDate: expected }]);
  });

  it.each([
    "Spring 2020",
    "13/2020",
    "00/2020",
    "2020-13",
    "01/02/2020",
    "Summer",
    "Q3 2020",
    "Mayhem 2020",
  ])("leaves the unparseable date %j unchanged", (stored) => {
    const exported = exportJsonResumeDocument(
      createResume({
        basics: { name: "Jane Doe" },
        education: [{ id: "e1", institution: "State U", startDate: stored, endDate: stored }],
      })
    );

    expect(exported.education).toMatchObject([{ startDate: stored, endDate: stored }]);
  });

  it.each(["Present", "present", "Current", "Now"])(
    "omits endDate for the current-role marker %j",
    (marker) => {
      const exported = exportJsonResumeDocument(
        createResume({
          basics: { name: "Jane Doe" },
          work: [
            {
              id: "w1",
              name: "Acme",
              position: "Engineer",
              startDate: "Jan 2020",
              endDate: marker,
            },
          ],
          projects: [{ id: "p1", name: "Site", startDate: "2022", endDate: marker }],
        })
      );

      expect(exported.work).toEqual([{ name: "Acme", position: "Engineer", startDate: "2020-01" }]);
      expect(exported.projects).toEqual([{ name: "Site", startDate: "2022" }]);
    }
  );

  it("converts dates only on export and leaves stored values untouched", () => {
    const resume = createResume({
      basics: { name: "Jane Doe" },
      work: [
        { id: "w1", name: "Acme", position: "Engineer", startDate: "Jan 2020", endDate: "Present" },
      ],
    });

    exportJsonResumeDocument(resume);

    expect(resume.work?.[0]).toMatchObject({ startDate: "Jan 2020", endDate: "Present" });
  });

  it("prunes empty strings, arrays and objects without dropping identity fields", () => {
    const exported = exportJsonResumeDocument(
      createResume({
        basics: {
          name: "Jane Doe",
          label: "Engineer",
          email: "jane@example.com",
          summary: "",
          location: { city: "" },
          profiles: [{ network: "", username: "", url: "" }],
        },
        work: [
          {
            id: "w1",
            name: "Acme",
            position: "Engineer",
            summary: "",
            highlights: [],
            startDate: "",
          },
        ],
        skills: [{ id: "s1", name: "TypeScript", level: "", keywords: [] }],
        interests: [],
      })
    );

    expect(exported).toEqual({
      basics: { name: "Jane Doe", label: "Engineer", email: "jane@example.com" },
      work: [{ name: "Acme", position: "Engineer" }],
      skills: [{ name: "TypeScript" }],
    });
    expect(JSON.stringify(exported)).not.toMatch(/""|\[\]|\{\}/);
  });

  it("round-trips an already conformant JSON Resume document unchanged", () => {
    const document = {
      basics: {
        name: "Jane Doe",
        label: "Senior Engineer",
        image: "https://janedoe.dev/me.png",
        email: "jane@example.com",
        phone: "555-0100",
        url: "https://janedoe.dev",
        summary: "Builds things.",
        location: {
          address: "1 Main St",
          postalCode: "10001",
          city: "New York",
          countryCode: "US",
          region: "NY",
        },
        profiles: [{ network: "GitHub", username: "janedoe", url: "https://github.com/janedoe" }],
      },
      work: [
        {
          name: "Acme Corp",
          position: "Senior Engineer",
          url: "https://acme.example",
          startDate: "2020-01",
          endDate: "2023-06-30",
          summary: "Led the platform team.",
          highlights: ["Led launch", "Cut costs"],
        },
        { name: "Globex", position: "Engineer", startDate: "2023-07" },
      ],
      volunteer: [
        {
          organization: "Food Bank",
          position: "Volunteer",
          startDate: "2019",
          endDate: "2020",
          summary: "Sorted donations.",
          highlights: ["Ran weekend shifts"],
        },
      ],
      education: [
        {
          institution: "State University",
          url: "https://state.example",
          area: "Computer Science",
          studyType: "BSc",
          startDate: "2012-09",
          endDate: "2016-05",
          score: "3.8",
          courses: ["Algorithms"],
        },
      ],
      awards: [{ title: "Hackathon Winner", date: "2021-04", awarder: "Devs", summary: "First." }],
      certificates: [
        { name: "Cloud Pro", date: "2022-11-02", issuer: "Cloud Co", url: "https://cloud.example" },
      ],
      publications: [
        {
          name: "On Resumes",
          publisher: "Journal",
          releaseDate: "2018-03",
          url: "https://journal.example/resumes",
          summary: "A study.",
        },
      ],
      skills: [{ name: "Web", level: "Master", keywords: ["TypeScript", "SolidJS"] }],
      languages: [{ language: "English", fluency: "Native speaker" }],
      interests: [{ name: "Hiking", keywords: ["Trails"] }],
      references: [{ name: "Alex Smith", reference: "Great to work with." }],
      projects: [
        {
          name: "Tailory",
          description: "Resume editor.",
          highlights: ["Private by design"],
          keywords: ["resume"],
          startDate: "2024",
          url: "https://tailory.example",
          roles: ["Author"],
          entity: "Personal",
          type: "application",
        },
      ],
    };

    expect(exportJsonResumeDocument(parseJsonResumeDocument(document))).toEqual(document);
    expect(
      JSON.parse(exportJsonResumeString(parseJsonResumeString(JSON.stringify(document))))
    ).toEqual(document);
  });
});
