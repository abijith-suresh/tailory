import { SECTION_KEYWORDS } from "./section-keywords";
import type { SectionType } from "./section-keywords";
import type {
  ResumeAward,
  ResumeBasics,
  ResumeCertificate,
  ResumeEducation,
  ResumeLocation,
  ResumeProject,
  ResumePublication,
  ResumeSchema,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from "@/types/resume";
import { EMPTY_RESUME } from "@/types/resume";

export interface ParseResult {
  data: ResumeSchema;
  confidence: number;
  rawSections: Record<string, string>;
}

// ─── Text normalisation ────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ") // non-breaking space
    .replace(/[\u2000-\u200b\u202f\u205f\u3000]/g, " ")
    .replace(/[^\S\n]+/g, " ") // collapse inline whitespace
    .replace(/\n{3,}/g, "\n\n") // max two blank lines
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Section detection ─────────────────────────────────────────────────────

function isSectionHeading(line: string): SectionType | null {
  const cleaned = line
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  for (const [sectionType, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (cleaned === kw) {
        return sectionType as SectionType;
      }
    }
  }
  return null;
}

function detectSectionStart(line: string): { remainder: string; section: SectionType } | null {
  const trimmed = line.trim();
  const directMatch = isSectionHeading(trimmed);

  if (directMatch && trimmed.length < 60) {
    return { section: directMatch, remainder: "" };
  }

  for (const [sectionType, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      const pattern = new RegExp(
        `^[^A-Za-z0-9]*${escapeRegExp(keyword)}\\s*[:-|–—]+\\s*(.+)$`,
        "i"
      );
      const match = trimmed.match(pattern);

      if (match) {
        return {
          section: sectionType as SectionType,
          remainder: match[1]?.trim() ?? "",
        };
      }
    }
  }

  return null;
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split("\n");
  const sections: Record<string, string> = {};
  let currentSection = "header";
  const currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      // Merge into existing section if it already exists
      if (sections[currentSection]) {
        sections[currentSection] += "\n" + content;
      } else {
        sections[currentSection] = content;
      }
    }
    currentLines.length = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const detected = detectSectionStart(trimmed);

    if (detected) {
      flush();
      currentSection = detected.section;

      if (detected.remainder) {
        currentLines.push(detected.remainder);
      }
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

// ─── Field extractors ──────────────────────────────────────────────────────

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+\d{1,3}[\s.-]\d{4,14}/;
const URL_RE = /https?:\/\/[^\s,)]+|(?:www|linkedin|github)\.[^\s,)]+/i;
const MONTH_PATTERN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_TOKEN_PATTERN = `${MONTH_PATTERN}[\\s,]+\\d{4}|\\d{4}|Present|Current|Now|present|current|now`;
const DATE_RE = new RegExp(DATE_TOKEN_PATTERN, "gi");
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN_PATTERN})\\s*[-–—]\\s*(${DATE_TOKEN_PATTERN})`,
  "i"
);
const BULLET_RE = /^[•\-*]\s*/;
const LOCATION_SPLIT_RE = /[|•·]/;
const LOCATION_REJECT_RE =
  /\b(remote|hybrid|relocate|engineer|developer|manager|director|lead|university|college|school|corp|inc|llc|ltd|company)\b/i;
const EDUCATION_SCORE_PATTERNS = [
  /\b(?:cgpa|gpa|score)\b\s*[:=-]?\s*(\d{1,3}(?:\.\d{1,2})?(?:\s*\/\s*\d{1,3}(?:\.\d{1,2})?)?%?)/i,
  /(\d{1,3}(?:\.\d{1,2})?(?:\s*\/\s*\d{1,3}(?:\.\d{1,2})?)?%?)\s*(?:cgpa|gpa)\b/i,
];
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  australia: "AU",
  canada: "CA",
  france: "FR",
  germany: "DE",
  greatbritain: "GB",
  india: "IN",
  uk: "GB",
  unitedkingdom: "GB",
  unitedstates: "US",
  usa: "US",
};

function extractEmail(text: string): string {
  return EMAIL_RE.exec(text)?.[0] ?? "";
}

function extractPhone(text: string): string {
  return PHONE_RE.exec(text)?.[0] ?? "";
}

function extractUrl(text: string): string {
  return URL_RE.exec(text)?.[0] ?? "";
}

function extractDates(text: string): { startDate: string; endDate: string } {
  const rangeMatch = text.match(DATE_RANGE_RE);
  if (rangeMatch) {
    return {
      startDate: rangeMatch[1]?.trim() ?? "",
      endDate: rangeMatch[2]?.trim() ?? "",
    };
  }

  const matches = [...text.matchAll(DATE_RE)].map((m) => m[0]);
  if (matches.length === 0) return { startDate: "", endDate: "" };

  const first = matches[0] ?? "";
  const rangeParts = first.split(/\s*[-–—]\s*/);
  if (rangeParts.length === 2) {
    return { startDate: rangeParts[0]?.trim() ?? "", endDate: rangeParts[1]?.trim() ?? "" };
  }
  return { startDate: first, endDate: matches[1] ?? "" };
}

function isBulletLine(line: string): boolean {
  return BULLET_RE.test(line);
}

function isDateLine(line: string): boolean {
  return !!line.match(DATE_RE);
}

function isUrlLine(line: string): boolean {
  return URL_RE.test(line);
}

function stripDates(text: string): string {
  return text
    .replace(new RegExp(DATE_RANGE_RE.source, "gi"), " ")
    .replace(new RegExp(DATE_RE.source, "gi"), " ")
    .replace(/\s*[|,–—-]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanLocationFragment(fragment: string): string {
  return fragment
    .replace(/^[\s,;:|•·-]+|[\s,;:|•·-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCountryCode(value: string, allowTwoLetterCode = false): string {
  const key = value.replace(/[^a-z]/gi, "").toLowerCase();

  if (!key) {
    return "";
  }

  if (COUNTRY_CODE_ALIASES[key]) {
    return COUNTRY_CODE_ALIASES[key];
  }

  if (allowTwoLetterCode && /^[a-z]{2}$/i.test(value.trim())) {
    return value.trim().toUpperCase();
  }

  return "";
}

function parseLocationFragment(fragment: string): ResumeLocation | null {
  const cleaned = cleanLocationFragment(fragment);

  if (
    !cleaned ||
    !cleaned.includes(",") ||
    EMAIL_RE.test(cleaned) ||
    PHONE_RE.test(cleaned) ||
    URL_RE.test(cleaned) ||
    /\d/.test(cleaned) ||
    cleaned.length > 60 ||
    LOCATION_REJECT_RE.test(cleaned)
  ) {
    return null;
  }

  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const city = parts[0] ?? "";
  const location: ResumeLocation = { city };

  if (parts.length === 2) {
    const second = parts[1] ?? "";
    const countryCode = normalizeCountryCode(second);

    if (countryCode) {
      location.countryCode = countryCode;
    } else {
      location.region = second;
    }

    return city && (location.region || location.countryCode) ? location : null;
  }

  const region = parts[1] ?? "";
  const countryCode = normalizeCountryCode(parts[2] ?? "", true);

  if (!region && !countryCode) {
    return null;
  }

  if (region) {
    location.region = region;
  }

  if (countryCode) {
    location.countryCode = countryCode;
  }

  return location;
}

function extractLocationFromHeader(lines: string[]): ResumeLocation {
  for (const line of lines) {
    for (const fragment of line.split(LOCATION_SPLIT_RE)) {
      const parsed = parseLocationFragment(fragment);
      if (parsed) {
        return parsed;
      }
    }

    const parsed = parseLocationFragment(line);
    if (parsed) {
      return parsed;
    }
  }

  return {};
}

function isLocationLine(line: string): boolean {
  const fragments = line
    .split(LOCATION_SPLIT_RE)
    .map((fragment) => fragment.trim())
    .filter(Boolean);

  if (fragments.length === 0) {
    return false;
  }

  return fragments.every((fragment) => Boolean(parseLocationFragment(fragment)));
}

function normalizeEducationScore(value: string): string {
  return value
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEducationScore(text: string): string {
  for (const pattern of EDUCATION_SCORE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return normalizeEducationScore(match[1]);
    }
  }

  return "";
}

function stripEducationScore(text: string): string {
  return EDUCATION_SCORE_PATTERNS.reduce((current, pattern) => {
    const stripped = current.replace(pattern, " ");
    return stripped
      .replace(/\s+[|,–—-]+\s+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, text);
}

function isLikelyEntryTitle(line: string): boolean {
  const cleaned = cleanListValue(stripDates(line));
  return (
    Boolean(cleaned) &&
    !isBulletLine(line) &&
    !isUrlLine(line) &&
    cleaned.length <= 120 &&
    !/[.!?]$/.test(cleaned) &&
    !/^[a-z]/.test(cleaned)
  );
}

function isLikelyEducationTitle(line: string): boolean {
  const cleaned = cleanListValue(stripDates(line));
  return Boolean(cleaned) && cleaned.length <= 140;
}

function parseEntryContent(lines: string[]): { detailLines: string[]; highlights: string[] } {
  const detailLines: string[] = [];
  const highlights: string[] = [];
  let activeHighlight = -1;

  for (const line of lines) {
    if (isBulletLine(line)) {
      highlights.push(cleanListValue(line));
      activeHighlight = highlights.length - 1;
      continue;
    }

    if (activeHighlight >= 0 && !isUrlLine(line) && !isLikelyEntryTitle(line)) {
      const continuation = cleanListValue(line);
      if (continuation) {
        highlights[activeHighlight] = `${highlights[activeHighlight]} ${continuation}`.trim();
        continue;
      }
    }

    activeHighlight = -1;

    if (isUrlLine(line)) {
      continue;
    }

    const detail = cleanListValue(stripDates(line));
    if (detail) {
      detailLines.push(detail);
    }
  }

  return { detailLines, highlights };
}

function parseWorkHeader(line: string): { name: string; position: string } {
  const cleaned = cleanListValue(stripDates(line));
  const parts = cleaned
    .split(/\s+[—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      position: parts[0] ?? "",
      name: parts.slice(1).join(" — "),
    };
  }

  return { name: cleaned, position: "" };
}

function splitEntryBlocks(text: string): string[] {
  const rawLines = text.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const content = current.join("\n").trim();
    if (content) blocks.push(content);
    current = [];
  };

  const shouldStartNewBlock = (line: string, nextLine: string) => {
    if (!current.length || !isLikelyEntryTitle(line)) {
      return false;
    }

    const nonBulletLines = current.filter((entryLine) => !isBulletLine(entryLine));
    const currentLooksComplete =
      current.some(
        (entryLine) => isBulletLine(entryLine) || isDateLine(entryLine) || isUrlLine(entryLine)
      ) || nonBulletLines.length >= 3;

    if (!currentLooksComplete) {
      return false;
    }

    if (isLikelyEntryTitle(nextLine)) {
      return true;
    }

    return current.some((entryLine) => isBulletLine(entryLine) || isDateLine(entryLine));
  };

  for (let index = 0; index < rawLines.length; index++) {
    const line = rawLines[index]?.trim() ?? "";
    const nextLine = rawLines[index + 1]?.trim() ?? "";

    if (!line) {
      flush();
      continue;
    }

    if (shouldStartNewBlock(line, nextLine)) {
      flush();
    }

    current.push(line);
  }

  flush();
  return blocks;
}

function extractNonBulletLines(lines: string[]): string[] {
  return parseEntryContent(lines).detailLines;
}

function cleanListValue(value: string): string {
  return value.replace(BULLET_RE, "").replace(/\s+/g, " ").trim();
}

function tokenizeSkills(text: string): string[] {
  const tokens = text
    .split(/\n+/)
    .flatMap((line) => line.split(/[|,;•]+/))
    .flatMap((part) => part.split(/\s\/\s/))
    .map((part) => part.replace(BULLET_RE, "").trim())
    .map((part) => part.replace(/^[A-Za-z][A-Za-z\s/&]+:\s*/, "").trim())
    .map((part) =>
      part
        .replace(/\s+/g, " ")
        .replace(/[.:;,]+$/, "")
        .trim()
    )
    .filter((part) => part.length > 0 && part.length <= 50)
    .filter((part) => part.split(/\s+/).length <= 5)
    .filter((part) => !/[.!?]$/.test(part));

  const seen = new Set<string>();

  return tokens.filter((token) => {
    const key = token.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitPrimaryAndSecondary(line: string): { primary: string; secondary: string } {
  const cleaned = cleanListValue(stripDates(line));
  const byMatch = cleaned.match(/^(.*)\s+by\s+(.+)$/i);

  if (byMatch) {
    return {
      primary: byMatch[1]?.trim() ?? cleaned,
      secondary: byMatch[2]?.trim() ?? "",
    };
  }

  const delimiterMatch = cleaned.match(/^(.*?)\s(?:[|–—-])\s(.*)$/);
  if (delimiterMatch) {
    return {
      primary: delimiterMatch[1]?.trim() ?? cleaned,
      secondary: delimiterMatch[2]?.trim() ?? "",
    };
  }

  const commaIndex = cleaned.lastIndexOf(",");
  if (commaIndex > -1) {
    return {
      primary: cleaned.slice(0, commaIndex).trim(),
      secondary: cleaned.slice(commaIndex + 1).trim(),
    };
  }

  return { primary: cleaned, secondary: "" };
}

function buildEntrySummary(lines: string[], highlights: string[]): string {
  return [...lines, ...highlights]
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function parseCertificateLine(line: string): Pick<ResumeCertificate, "name" | "issuer" | "date"> {
  const dates = extractDates(line);
  const date = dates.startDate || dates.endDate;
  const withoutDates = line
    .replace(new RegExp(DATE_RE.source, "gi"), "")
    .replace(/\(\s*\)/g, "")
    .replace(/[|,–—-]+$/, "")
    .trim();
  const { primary, secondary } = splitPrimaryAndSecondary(withoutDates);
  const issuer = secondary
    .replace(/^issued by\s+/i, "")
    .replace(/[|,–—-]+$/, "")
    .trim();

  return {
    name: primary.replace(/[|,–—-]+$/, "").trim(),
    issuer,
    date,
  };
}

// ─── Section parsers ───────────────────────────────────────────────────────

function parseHeader(text: string): ResumeBasics {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const remaining = lines.join(" ");
  const contactFragments = new Set(
    lines
      .flatMap((line) => line.split(/[|•·]/))
      .map((fragment) => fragment.trim())
      .filter(
        (fragment) => EMAIL_RE.test(fragment) || PHONE_RE.test(fragment) || URL_RE.test(fragment)
      )
  );
  const location = extractLocationFromHeader(lines);
  const nonContactLines = lines.filter((line) => {
    if (!line) return false;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) {
      return false;
    }

    const fragments = line.split(/[|•·]/).map((fragment) => fragment.trim());
    return fragments.some((fragment) => fragment && !contactFragments.has(fragment));
  });
  const contentLines = nonContactLines.filter((line) => !isLocationLine(line));
  const name =
    contentLines.find(
      (line) => !/[a-z]/.test(line) && line.replace(/[^A-Za-z]/g, "").length >= 6
    ) ??
    contentLines[0] ??
    nonContactLines[0] ??
    lines[0] ??
    "";
  const label = contentLines.find((line) => line !== name) ?? "";

  return {
    name,
    label,
    email: extractEmail(remaining),
    phone: extractPhone(remaining),
    url: extractUrl(remaining),
    location,
    profiles: [],
  };
}

function parseWork(text: string): ResumeWork[] {
  const entries: ResumeWork[] = [];
  const blocks = splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const { detailLines, highlights } = parseEntryContent(lines);
    const parsedHeader = parseWorkHeader(detailLines[0] ?? lines[0] ?? "");

    entries.push({
      id: crypto.randomUUID(),
      name: detailLines.length > 1 ? (detailLines[0] ?? parsedHeader.name) : parsedHeader.name,
      position:
        detailLines.length > 1 ? (detailLines[1] ?? parsedHeader.position) : parsedHeader.position,
      startDate: dates.startDate,
      endDate: dates.endDate,
      highlights,
    });
  }

  return entries;
}

function parseVolunteer(text: string): ResumeVolunteer[] {
  const entries: ResumeVolunteer[] = [];
  const blocks = splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const { detailLines, highlights } = parseEntryContent(lines);
    const parsedHeader = parseWorkHeader(detailLines[0] ?? lines[0] ?? "");

    entries.push({
      id: crypto.randomUUID(),
      organization:
        detailLines.length > 1 ? (detailLines[0] ?? parsedHeader.name) : parsedHeader.name,
      position:
        detailLines.length > 1 ? (detailLines[1] ?? parsedHeader.position) : parsedHeader.position,
      startDate: dates.startDate,
      endDate: dates.endDate,
      highlights,
    });
  }

  return entries;
}

function parseEducation(text: string): ResumeEducation[] {
  const entries: ResumeEducation[] = [];
  const hasBulletTitles = text.split("\n").some((line) => isBulletLine(line));
  const blocks = hasBulletTitles
    ? text
        .split(/\n(?=\s*[•\-*]\s)/)
        .map((block) => block.trim())
        .filter(Boolean)
    : splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const score = extractEducationScore(block);
    const sanitizedLines = lines.map((line) => stripEducationScore(line)).filter(Boolean);
    const detailLines = extractNonBulletLines(sanitizedLines);
    const titleLine = hasBulletTitles
      ? sanitizedLines.find((line) => isBulletLine(line) && isLikelyEducationTitle(line))
      : undefined;
    const normalizedTitle = cleanListValue(stripDates(titleLine ?? ""));
    const institutionLine = hasBulletTitles
      ? (detailLines.find((line) => line !== normalizedTitle) ?? "")
      : (detailLines[0] ?? lines[0] ?? "");

    entries.push({
      id: crypto.randomUUID(),
      institution: institutionLine,
      studyType: hasBulletTitles ? normalizedTitle : (detailLines[1] ?? ""),
      area: hasBulletTitles
        ? (detailLines.find((line) => line !== institutionLine && line !== normalizedTitle) ?? "")
        : (detailLines[2] ?? ""),
      startDate: dates.startDate,
      endDate: dates.endDate,
      score,
    });
  }

  return entries;
}

function parseAwards(text: string): ResumeAward[] {
  const entries: ResumeAward[] = [];
  const blocks = splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const date = dates.startDate || dates.endDate;
    const { detailLines, highlights } = parseEntryContent(lines);
    const { primary, secondary } = splitPrimaryAndSecondary(detailLines[0] ?? lines[0] ?? "");
    const hasSeparateOrganizationLine = !secondary && detailLines.length > 2;
    const awarder = secondary || (hasSeparateOrganizationLine ? (detailLines[1] ?? "") : "");
    const summary = buildEntrySummary(
      detailLines.slice(hasSeparateOrganizationLine ? 2 : 1),
      highlights
    );

    entries.push({
      id: crypto.randomUUID(),
      title: primary,
      awarder,
      date,
      summary,
    });
  }

  return entries;
}

function parseSkills(text: string): ResumeSkill[] {
  const items = tokenizeSkills(text);

  return items.map((name) => ({
    id: crypto.randomUUID(),
    name,
    keywords: [],
  }));
}

function parsePublications(text: string): ResumePublication[] {
  const entries: ResumePublication[] = [];
  const blocks = splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const releaseDate = dates.startDate || dates.endDate;
    const { detailLines, highlights } = parseEntryContent(lines);
    const { primary, secondary } = splitPrimaryAndSecondary(detailLines[0] ?? lines[0] ?? "");
    const hasSeparatePublisherLine = !secondary && detailLines.length > 2;
    const publisher = secondary || (hasSeparatePublisherLine ? (detailLines[1] ?? "") : "");
    const summary = buildEntrySummary(
      detailLines.slice(hasSeparatePublisherLine ? 2 : 1),
      highlights
    );

    entries.push({
      id: crypto.randomUUID(),
      name: primary,
      publisher,
      releaseDate,
      url: extractUrl(block),
      summary,
    });
  }

  return entries;
}

function parseProjects(text: string): ResumeProject[] {
  const entries: ResumeProject[] = [];
  const blocks = splitEntryBlocks(text);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const { detailLines, highlights } = parseEntryContent(lines);

    entries.push({
      id: crypto.randomUUID(),
      name: detailLines[0] ?? lines[0] ?? "",
      description: detailLines[1] ?? "",
      highlights,
      url: extractUrl(block),
    });
  }

  return entries;
}

function parseCertificates(text: string): ResumeCertificate[] {
  const entries: ResumeCertificate[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.length < 3) continue;
    const parsed = parseCertificateLine(line);
    entries.push({
      id: crypto.randomUUID(),
      name: parsed.name,
      issuer: parsed.issuer,
      date: parsed.date,
    });
  }

  return entries;
}

// ─── Confidence score ──────────────────────────────────────────────────────

function calcConfidence(resume: ResumeSchema): number {
  let score = 0;
  if (resume.basics.name) score += 20;
  if (resume.basics.email) score += 15;
  if (resume.basics.phone) score += 10;
  if ((resume.work?.length ?? 0) > 0) score += 20;
  if ((resume.education?.length ?? 0) > 0) score += 15;
  if ((resume.skills?.length ?? 0) > 0) score += 10;
  if (resume.basics.summary) score += 10;
  return Math.min(score, 100);
}

// ─── Main entry point ──────────────────────────────────────────────────────

export async function parseResume(rawText: string): Promise<ParseResult> {
  const normalized = normalize(rawText);
  const rawSections = splitIntoSections(normalized);

  const data: ResumeSchema = JSON.parse(JSON.stringify(EMPTY_RESUME));

  // Basics from header
  if (rawSections.header) {
    data.basics = parseHeader(rawSections.header);
  }

  // Summary
  if (rawSections.summary) {
    data.basics.summary = rawSections.summary.trim();
  }

  // Work
  if (rawSections.work) {
    data.work = parseWork(rawSections.work);
  }

  // Volunteer
  if (rawSections.volunteer) {
    data.volunteer = parseVolunteer(rawSections.volunteer);
  }

  // Education
  if (rawSections.education) {
    data.education = parseEducation(rawSections.education);
  }

  // Awards
  if (rawSections.awards) {
    data.awards = parseAwards(rawSections.awards);
  }

  // Publications
  if (rawSections.publications) {
    data.publications = parsePublications(rawSections.publications);
  }

  // Skills
  if (rawSections.skills) {
    data.skills = parseSkills(rawSections.skills);
  }

  // Projects
  if (rawSections.projects) {
    data.projects = parseProjects(rawSections.projects);
  }

  // Certificates
  if (rawSections.certificates) {
    data.certificates = parseCertificates(rawSections.certificates);
  }

  const confidence = calcConfidence(data);

  return { data, confidence, rawSections };
}
