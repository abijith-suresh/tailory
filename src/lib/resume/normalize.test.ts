import { describe, expect, it } from "vitest";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import { normalizeResume, ResumeExportValidationError, validateResumeForExport } from "./normalize";

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

describe("normalizeResume", () => {
  it("trims fields, normalizes urls and dates, and prunes empty items", () => {
    const normalized = normalizeResume(
      createResume({
        basics: {
          name: "  Jane Doe  ",
          url: "janedoe.dev/portfolio ",
          summary: "  Built products at scale.  ",
          location: { city: "  New York ", countryCode: " us " },
        },
        work: [
          {
            id: "work-1",
            name: "  Acme Corp  ",
            position: " Senior Engineer ",
            startDate: "january 2021",
            endDate: "current",
            url: "www.acme.com/careers",
            highlights: ["  Led launch  ", "   "],
          },
          {
            id: "work-2",
            name: " ",
            position: "",
            highlights: ["  "],
          },
        ],
        projects: [
          {
            id: "project-1",
            name: " Portfolio ",
            url: "github.com/jane/portfolio",
            highlights: ["  Shipped it  ", ""],
          },
          {
            id: "project-2",
            name: " ",
            description: "  ",
            highlights: [" "],
          },
        ],
        skills: [
          { id: "skill-1", name: " TypeScript ", keywords: ["  testing  ", ""] },
          { id: "skill-2", name: " " },
        ],
        certificates: [
          { id: "cert-1", name: " AWS SAA ", date: "sept 2023", url: "aws.amazon.com/cert" },
          { id: "cert-2", name: " " },
        ],
      })
    );

    expect(normalized.basics).toMatchObject({
      name: "Jane Doe",
      url: "https://janedoe.dev/portfolio",
      summary: "Built products at scale.",
      location: { city: "New York", countryCode: "US" },
    });
    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: "work-1",
        name: "Acme Corp",
        position: "Senior Engineer",
        startDate: "Jan 2021",
        endDate: "Present",
        url: "https://www.acme.com/careers",
        highlights: ["Led launch"],
      }),
    ]);
    expect(normalized.projects).toEqual([
      expect.objectContaining({
        id: "project-1",
        name: "Portfolio",
        url: "https://github.com/jane/portfolio",
        highlights: ["Shipped it"],
      }),
    ]);
    expect(normalized.skills).toEqual([
      expect.objectContaining({ name: "TypeScript", keywords: ["testing"] }),
    ]);
    expect(normalized.certificates).toEqual([
      expect.objectContaining({
        name: "AWS SAA",
        date: "Sep 2023",
        url: "https://aws.amazon.com/cert",
      }),
    ]);
  });
});

describe("validateResumeForExport", () => {
  it("rejects resumes without a name", () => {
    const result = validateResumeForExport(
      createResume({
        basics: { summary: "Experienced engineer" },
      })
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Add your name before exporting.");
  });

  it("rejects resumes with only a name and no substantive content", () => {
    const result = validateResumeForExport(
      createResume({
        basics: { name: "Jane Doe" },
      })
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe(
      "Add a summary, experience, education, skills, project, or certification before exporting."
    );
  });

  it("accepts a resume once normalization leaves exportable content", () => {
    const result = validateResumeForExport(
      createResume({
        basics: { name: "  Jane Doe " },
        projects: [{ id: "project-1", name: " Portfolio ", url: "janedoe.dev" }],
      })
    );

    expect(result.ok).toBe(true);
    expect(result.normalizedResume.basics.name).toBe("Jane Doe");
    expect(result.normalizedResume.projects?.[0]).toMatchObject({
      name: "Portfolio",
      url: "https://janedoe.dev",
    });
  });

  it("uses a dedicated export error type", () => {
    const error = new ResumeExportValidationError("Nope");

    expect(error.name).toBe("ResumeExportValidationError");
    expect(error.message).toBe("Nope");
  });
});
