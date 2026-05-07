import { describe, expect, it } from "vitest";

import {
  compareResumeDates,
  validateChronologicalDateRange,
  validateOptionalPhone,
  validateRequiredName,
} from "./validation";

describe("editor validation helpers", () => {
  it("accepts empty optional phone values and common real-world phone formats", () => {
    expect(validateOptionalPhone("")).toBe("");
    expect(validateOptionalPhone("+1 (555) 123-4567")).toBe("");
    expect(validateOptionalPhone("+44 20 7946 0958")).toBe("");
    expect(validateOptionalPhone("5551234567")).toBe("");
  });

  it("rejects phone values that do not resemble phone numbers", () => {
    expect(validateOptionalPhone("abc")).toBe("Enter a valid phone number.");
    expect(validateOptionalPhone("12-34")).toBe("Enter a valid phone number.");
  });

  it("requires a non-empty basics name once the field is touched", () => {
    expect(validateRequiredName("")).toBe("Enter your name.");
    expect(validateRequiredName("  Jane Doe ")).toBe("");
  });

  it("parses supported resume date formats for chronological comparison", () => {
    expect(compareResumeDates("2022", "2021")).toBeGreaterThan(0);
    expect(compareResumeDates("Feb 2022", "2022")).toBeGreaterThan(0);
    expect(compareResumeDates("present", "Jan 2024")).toBeGreaterThan(0);
    expect(compareResumeDates("Apr 2020", "Apr 2020")).toBe(0);
  });

  it("validates work and education ranges only when both dates are comparable", () => {
    expect(validateChronologicalDateRange("2020", "2022")).toBe("");
    expect(validateChronologicalDateRange("Jan 2024", "Present")).toBe("");
    expect(validateChronologicalDateRange("", "Present")).toBe("");
    expect(validateChronologicalDateRange("Soon", "Later")).toBe("");
    expect(validateChronologicalDateRange("2024", "2021")).toBe(
      "End date must be the same as or later than the start date."
    );
    expect(validateChronologicalDateRange("Mar 2024", "Feb 2024")).toBe(
      "End date must be the same as or later than the start date."
    );
  });
});
