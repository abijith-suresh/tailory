import { describe, expect, it } from "vitest";

import {
  SECTION_DEFINITIONS,
  TOTAL_SECTIONS,
  getCompletedSectionsCount,
  getSectionDefinition,
  isResumeEmpty,
  isSectionComplete,
} from "@/lib/sections/registry";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

describe("section registry", () => {
  it("defines all 10 canonical resume sections with labels and descriptions", () => {
    expect(TOTAL_SECTIONS).toBe(10);
    expect(SECTION_DEFINITIONS.length).toBe(10);

    const expectedIds = [
      "basics",
      "summary",
      "work",
      "education",
      "skills",
      "languages",
      "interests",
      "references",
      "projects",
      "certs",
    ];

    expect(SECTION_DEFINITIONS.map((s) => s.id)).toEqual(expectedIds);

    for (const section of SECTION_DEFINITIONS) {
      expect(section.label).toBeTruthy();
      expect(section.shortLabel).toBeTruthy();
      expect(section.subtitle).toBeTruthy();
      expect(typeof section.isComplete).toBe("function");
    }
  });

  it("retrieves individual section definitions by id", () => {
    const basics = getSectionDefinition("basics");
    expect(basics).toBeDefined();
    expect(basics?.label).toBe("Basic Info");
    expect(basics?.shortLabel).toBe("Basics");

    const work = getSectionDefinition("work");
    expect(work).toBeDefined();
    expect(work?.label).toBe("Work Experience");
    expect(work?.shortLabel).toBe("Work");
  });

  it("evaluates section completeness correctly", () => {
    const empty = structuredClone(EMPTY_RESUME);
    expect(isSectionComplete("basics", empty)).toBe(false);
    expect(isSectionComplete("work", empty)).toBe(false);
    expect(getCompletedSectionsCount(empty)).toBe(0);
    expect(isResumeEmpty(empty)).toBe(true);

    const populated: ResumeSchema = {
      ...empty,
      basics: {
        ...empty.basics,
        name: "Jane Doe",
        summary: "Staff Engineer with 10 years experience.",
      },
      work: [
        {
          id: "w1",
          name: "Acme Corp",
          position: "Lead Architect",
        },
      ],
      skills: [
        {
          id: "s1",
          name: "TypeScript",
        },
      ],
    };

    expect(isSectionComplete("basics", populated)).toBe(true);
    expect(isSectionComplete("summary", populated)).toBe(true);
    expect(isSectionComplete("work", populated)).toBe(true);
    expect(isSectionComplete("skills", populated)).toBe(true);
    expect(isSectionComplete("education", populated)).toBe(false);

    expect(getCompletedSectionsCount(populated)).toBe(4);
    expect(isResumeEmpty(populated)).toBe(false);
  });
});
