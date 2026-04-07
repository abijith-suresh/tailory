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
      projects: [{ id: "project-1", name: "Portfolio", url: "janedoe.dev" }],
    });

    const roundTripped = parseJsonResumeString(exportJsonResumeString(source));

    expect(roundTripped.basics).toMatchObject({
      name: "Jane Doe",
      label: "Senior Engineer",
      email: "jane@example.com",
    });
    expect(roundTripped.projects?.[0]).toMatchObject({
      name: "Portfolio",
      url: "https://janedoe.dev",
    });
    expect(roundTripped.projects?.[0]?.id).toBeTruthy();
  });
});
