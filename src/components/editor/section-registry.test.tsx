import { describe, expect, it } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

import {
  COMPLETION_SECTIONS,
  EDITOR_SECTIONS,
  getSectionCompletionSummary,
} from "./section-registry";

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

describe("editor section registry", () => {
  it("derives editable navigation from a shared registry", () => {
    expect(EDITOR_SECTIONS.map((section) => section.id)).toEqual([
      "basics",
      "summary",
      "work",
      "education",
      "skills",
      "projects",
      "certificates",
    ]);
  });

  it("counts all render-supported sections in completion metrics", () => {
    const summary = getSectionCompletionSummary(
      createResume({
        basics: { name: "Jane Doe", summary: "Frontend engineer" },
        work: [{ id: "work-1", name: "Acme", position: "Engineer" }],
        volunteer: [{ id: "vol-1", organization: "Code Club", position: "Mentor" }],
      })
    );

    expect(summary.total).toBe(COMPLETION_SECTIONS.length);
    expect(summary.completed).toBe(4);
    expect(summary.completedSectionIds).toEqual(["basics", "summary", "work", "volunteer"]);
  });
});
