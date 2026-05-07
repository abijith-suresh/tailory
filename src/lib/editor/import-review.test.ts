import { describe, expect, it } from "vitest";

import type { ImportFeedback } from "@/store/resume";

import { formatImportReviewCounts, getImportConfidenceState } from "./import-review";

function createFeedback(overrides?: Partial<ImportFeedback>): ImportFeedback {
  return {
    confidence: 72,
    work: 2,
    education: 1,
    skills: 3,
    projects: 0,
    certificates: 0,
    ...overrides,
  };
}

describe("import review helpers", () => {
  it("maps parser confidence scores on the real 0-100 scale", () => {
    expect(getImportConfidenceState(90).label).toBe("High parse confidence");
    expect(getImportConfidenceState(65).label).toBe("Medium parse confidence");
    expect(getImportConfidenceState(35).label).toBe("Low parse confidence");
  });

  it("summarizes imported section counts for the review card", () => {
    expect(formatImportReviewCounts(createFeedback())).toBe(
      "Imported 2 jobs, 1 education entry, and 3 skills."
    );
    expect(formatImportReviewCounts(createFeedback({ work: 0, education: 0, skills: 0 }))).toBe(
      "Imported content is available to review section by section."
    );
  });
});
