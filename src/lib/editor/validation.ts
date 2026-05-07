const PHONE_ALLOWED_RE = /^[+()\-\s\d./]+$/u;
const MONTH_YEAR_RE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})$/iu;
const YEAR_RE = /^\d{4}$/u;
const PRESENT_RE = /^(present|current|now)$/iu;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toComparableResumeDate(value: string): number | null {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (PRESENT_RE.test(normalized)) {
    return Number.POSITIVE_INFINITY;
  }

  if (YEAR_RE.test(normalized)) {
    return Number.parseInt(normalized, 10) * 12;
  }

  const match = normalized.match(MONTH_YEAR_RE);
  if (!match) {
    return null;
  }

  const month = MONTH_INDEX[match[1]?.toLowerCase() ?? ""];
  const year = Number.parseInt(match[2] ?? "", 10);

  if (month === undefined || Number.isNaN(year)) {
    return null;
  }

  return year * 12 + month;
}

export function validateRequiredName(value: string): string {
  return normalizeWhitespace(value) ? "" : "Enter your name.";
}

export function validateOptionalPhone(value: string): string {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return "";
  }

  const digits = normalized.replace(/\D/g, "");

  if (!PHONE_ALLOWED_RE.test(normalized) || digits.length < 7) {
    return "Enter a valid phone number.";
  }

  return "";
}

export function compareResumeDates(left: string, right: string): number {
  const leftValue = toComparableResumeDate(left);
  const rightValue = toComparableResumeDate(right);

  if (leftValue === null || rightValue === null) {
    return 0;
  }

  return leftValue - rightValue;
}

export function validateChronologicalDateRange(startDate?: string, endDate?: string): string {
  const startValue = startDate ? toComparableResumeDate(startDate) : null;
  const endValue = endDate ? toComparableResumeDate(endDate) : null;

  if (startValue === null || endValue === null) {
    return "";
  }

  return startValue <= endValue ? "" : "End date must be the same as or later than the start date.";
}
