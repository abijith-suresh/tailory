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
    .replace(/[^\S\n]+/g, " ") // collapse inline whitespace
    .replace(/\n{3,}/g, "\n\n") // max two blank lines
    .trim();
}

// ─── Section detection ─────────────────────────────────────────────────────

function isSectionHeading(line: string): SectionType | null {
  const cleaned = line
    .trim()
    .toLowerCase()
    .replace(/[:\-–—]+$/, "")
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
    // Only trigger a new section on known keyword headings (short lines)
    const detected = isSectionHeading(trimmed);

    if (detected && trimmed.length < 60) {
      flush();
      currentSection = detected;
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
const DATE_RE =
  /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,]+\d{4}|\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current|Now|present|current)/gi;

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
  const matches = [...text.matchAll(DATE_RE)].map((m) => m[0]);
  if (matches.length === 0) return { startDate: "", endDate: "" };

  const first = matches[0] ?? "";
  const rangeParts = first.split(/\s*[-–—]\s*/);
  if (rangeParts.length === 2) {
    return { startDate: rangeParts[0]?.trim() ?? "", endDate: rangeParts[1]?.trim() ?? "" };
  }
  return { startDate: first, endDate: matches[1] ?? "" };
}

// ─── Section parsers ───────────────────────────────────────────────────────

function parseHeader(text: string): ResumeBasics {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const name = lines[0] ?? "";
  // label is the second line if it's not contact info
  const label = lines[1] && !EMAIL_RE.test(lines[1]) && !PHONE_RE.test(lines[1]) ? lines[1] : "";
  const remaining = lines.join(" ");

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
  // Split on double newlines as entry boundaries
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);
    const highlights = lines
      .filter((l) => /^[•\-*]/.test(l))
      .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
      .filter(Boolean);

    entries.push({
      id: crypto.randomUUID(),
      name: lines[0] ?? "",
      position: lines[1] ?? "",
      startDate: dates.startDate,
      endDate: dates.endDate,
      highlights,
    });
  }

  return entries;
}

function parseEducation(text: string): ResumeEducation[] {
  const entries: ResumeEducation[] = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const dates = extractDates(block);

    entries.push({
      id: crypto.randomUUID(),
      institution: lines[0] ?? "",
      studyType: lines[1] ?? "",
      area: lines[2] ?? "",
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  }

  return entries;
}

function parseSkills(text: string): ResumeSkill[] {
  // Skills may be comma/bullet/newline separated
  const items = text
    .split(/[,\n•\-*|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60);

  return items.map((name) => ({
    id: crypto.randomUUID(),
    name,
    keywords: [],
  }));
}

function parseProjects(text: string): ResumeProject[] {
  const entries: ResumeProject[] = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const highlights = lines
      .filter((l) => /^[•\-*]/.test(l))
      .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
      .filter(Boolean);

    entries.push({
      id: crypto.randomUUID(),
      name: lines[0] ?? "",
      description: lines[1] ?? "",
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
    const dates = extractDates(line);
    entries.push({
      id: crypto.randomUUID(),
      name: line
        .replace(new RegExp(DATE_RE.source, "gi"), "")
        .replace(/[,–—-]+$/, "")
        .trim(),
      date: dates.startDate || dates.endDate,
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
