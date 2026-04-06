import { SECTION_KEYWORDS } from "./section-keywords";
import type { SectionType } from "./section-keywords";
import type {
  ResumeBasics,
  ResumeCertificate,
  ResumeEducation,
  ResumeProject,
  ResumeSchema,
  ResumeSkill,
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

function parseCertificateLine(line: string): Pick<ResumeCertificate, "name" | "issuer" | "date"> {
  const dates = extractDates(line);
  const date = dates.startDate || dates.endDate;
  const withoutDates = line
    .replace(new RegExp(DATE_RE.source, "gi"), "")
    .replace(/\(\s*\)/g, "")
    .replace(/[|,–—-]+$/, "")
    .trim();

  let name = withoutDates;
  let issuer = "";

  const byMatch = withoutDates.match(/^(.*)\s+by\s+(.+)$/i);
  if (byMatch) {
    name = byMatch[1]?.trim() ?? withoutDates;
    issuer = byMatch[2]?.trim() ?? "";
  } else {
    const delimiterMatch = withoutDates.match(/^(.*?)\s(?:[|–—-])\s(.*)$/);
    if (delimiterMatch) {
      name = delimiterMatch[1]?.trim() ?? withoutDates;
      issuer = delimiterMatch[2]?.trim() ?? "";
    } else {
      const commaIndex = withoutDates.lastIndexOf(",");
      if (commaIndex > -1) {
        name = withoutDates.slice(0, commaIndex).trim();
        issuer = withoutDates.slice(commaIndex + 1).trim();
      }
    }
  }

  issuer = issuer
    .replace(/^issued by\s+/i, "")
    .replace(/[|,–—-]+$/, "")
    .trim();

  return {
    name: name.replace(/[|,–—-]+$/, "").trim(),
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
  const nonContactLines = lines.filter((line) => {
    if (!line) return false;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) {
      return false;
    }

    const fragments = line.split(/[|•·]/).map((fragment) => fragment.trim());
    return fragments.some((fragment) => fragment && !contactFragments.has(fragment));
  });
  const name =
    nonContactLines.find(
      (line) => !/[a-z]/.test(line) && line.replace(/[^A-Za-z]/g, "").length >= 6
    ) ??
    nonContactLines[0] ??
    lines[0] ??
    "";
  const label = nonContactLines.find((line) => line !== name) ?? "";

  return {
    name,
    label,
    email: extractEmail(remaining),
    phone: extractPhone(remaining),
    url: extractUrl(remaining),
    location: {},
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
    const detailLines = extractNonBulletLines(lines);
    const titleLine = hasBulletTitles
      ? lines.find((line) => isBulletLine(line) && isLikelyEducationTitle(line))
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

  // Education
  if (rawSections.education) {
    data.education = parseEducation(rawSections.education);
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
