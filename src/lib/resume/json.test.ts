import { describe, expect, it } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

import {
  exportJsonResumeDocument,
  exportJsonResumeString,
  parseJsonResumeDocument,
  parseJsonResumeString,
} from "./json";

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

  it("rejects unsupported top-level fields with actionable feedback", () => {
    expect(() =>
      parseJsonResumeDocument({
        basics: { name: "Jane Doe" },
        portfolio: { website: "https://janedoe.dev" },
      })
    ).toThrowError(
      "Unsupported JSON Resume fields: portfolio. Tailory currently supports basics, work, volunteer, education, awards, certificates, publications, skills, languages, interests, references, and projects."
    );
  });

  it("ignores JSON Resume metadata fields that Tailory does not store", () => {
    const parsed = parseJsonResumeDocument({
      $schema: "https://jsonresume.org/schema",
      meta: { theme: "kendall" },
      basics: { name: "Jane Doe", email: "jane@example.com" },
    });

    expect(parsed.basics).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
    });
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
});
