import {
  EMPTY_RESUME,
  type ResumeAward,
  type ResumeBasics,
  type ResumeCertificate,
  type ResumeEducation,
  type ResumeInterest,
  type ResumeLanguage,
  type ResumeLocation,
  type ResumeProfile,
  type ResumeProject,
  type ResumePublication,
  type ResumeReference,
  type ResumeSchema,
  type ResumeSkill,
  type ResumeVolunteer,
  type ResumeWork,
} from "@/types/resume";

const MONTH_ABBREVIATIONS: Record<string, string> = {
  jan: "Jan",
  january: "Jan",
  feb: "Feb",
  february: "Feb",
  mar: "Mar",
  march: "Mar",
  apr: "Apr",
  april: "Apr",
  may: "May",
  jun: "Jun",
  june: "Jun",
  jul: "Jul",
  july: "Jul",
  aug: "Aug",
  august: "Aug",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  oct: "Oct",
  october: "Oct",
  nov: "Nov",
  november: "Nov",
  dec: "Dec",
  december: "Dec",
};

const URL_LIKE_RE = /^(?:www\.|[a-z0-9.-]+\.[a-z]{2,})(?:\/[^\s]*)?$/i;
const PRESENT_RE = /^(present|current|now)$/i;
const YEAR_RE = /^\d{4}$/;
const MONTH_YEAR_RE = /^([a-z]+)\.?\s*,?\s*(\d{4})$/i;

export class ResumeExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeExportValidationError";
  }
}

export interface ResumeExportValidationResult {
  ok: boolean;
  normalizedResume: ResumeSchema;
  message?: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureId(id: string | undefined): string {
  if (typeof id === "string" && id.trim()) {
    return id.trim();
  }

  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `generated-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeInlineText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter((line, index, lines) => line || (index > 0 && index < lines.length - 1))
    .join("\n")
    .trim();
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeInlineText(value)).filter(Boolean);
}

function normalizeUrl(value: unknown): string | undefined {
  const trimmed = normalizeInlineText(value).replace(/[),.;:!?]+$/g, "");

  if (!trimmed) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : URL_LIKE_RE.test(trimmed)
      ? `https://${trimmed}`
      : "";

  if (!candidate) {
    return undefined;
  }

  try {
    const url = new URL(candidate);

    if (!/^https?:$/i.test(url.protocol)) {
      return undefined;
    }

    if (url.pathname === "/" && !url.search && !url.hash) {
      return url.origin;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeDate(value: unknown): string | undefined {
  const trimmed = normalizeInlineText(value).replace(/[.,]+$/g, "");

  if (!trimmed) {
    return undefined;
  }

  if (PRESENT_RE.test(trimmed)) {
    return "Present";
  }

  if (YEAR_RE.test(trimmed)) {
    return trimmed;
  }

  const monthYearMatch = trimmed.match(MONTH_YEAR_RE);
  if (!monthYearMatch) {
    return trimmed;
  }

  const month = MONTH_ABBREVIATIONS[monthYearMatch[1]?.toLowerCase() ?? ""];
  const year = monthYearMatch[2];

  if (!month || !year) {
    return trimmed;
  }

  return `${month} ${year}`;
}

function hasLocationContent(location: ResumeLocation): boolean {
  return Boolean(
    location.address ||
    location.postalCode ||
    location.city ||
    location.countryCode ||
    location.region
  );
}

function normalizeLocation(location: unknown): ResumeLocation {
  const source =
    typeof location === "object" && location !== null ? (location as ResumeLocation) : {};

  return {
    address: normalizeInlineText(source.address),
    postalCode: normalizeInlineText(source.postalCode),
    city: normalizeInlineText(source.city),
    countryCode: normalizeInlineText(source.countryCode).toUpperCase(),
    region: normalizeInlineText(source.region),
  };
}

function normalizeProfile(profile: unknown): ResumeProfile | undefined {
  const source =
    typeof profile === "object" && profile !== null ? (profile as ResumeProfile) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeProfile = {
    network: normalizeInlineText(source.network),
    username: normalizeInlineText(source.username),
    url: normalizeUrl(source.url) ?? "",
  };

  if (!normalized.network && !normalized.username && !normalized.url) {
    return undefined;
  }

  return normalized;
}

function normalizeBasics(basics: unknown): ResumeBasics {
  const source =
    typeof basics === "object" && basics !== null ? (basics as ResumeBasics) : EMPTY_RESUME.basics;
  const location = normalizeLocation(source.location);

  return {
    name: normalizeInlineText(source.name),
    label: normalizeInlineText(source.label),
    image: normalizeUrl(source.image),
    email: normalizeInlineText(source.email),
    phone: normalizeInlineText(source.phone),
    url: normalizeUrl(source.url),
    summary: normalizeMultilineText(source.summary),
    location,
    profiles: Array.isArray(source.profiles)
      ? (source.profiles
          .map((profile) => normalizeProfile(profile))
          .filter(Boolean) as ResumeProfile[])
      : [],
  };
}

function normalizeWorkEntry(entry: unknown): ResumeWork | undefined {
  const source = typeof entry === "object" && entry !== null ? (entry as ResumeWork) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeWork = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    position: normalizeInlineText(source.position),
    url: normalizeUrl(source.url),
    startDate: normalizeDate(source.startDate),
    endDate: normalizeDate(source.endDate),
    summary: normalizeMultilineText(source.summary),
    highlights: normalizeStringArray(source.highlights),
  };
  const highlights = normalized.highlights ?? [];

  if (
    !normalized.name &&
    !normalized.position &&
    !normalized.url &&
    !normalized.startDate &&
    !normalized.endDate &&
    !normalized.summary &&
    highlights.length === 0
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeVolunteerEntry(entry: unknown): ResumeVolunteer | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeVolunteer) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeVolunteer = {
    id: ensureId(source.id),
    organization: normalizeInlineText(source.organization),
    position: normalizeInlineText(source.position),
    url: normalizeUrl(source.url),
    startDate: normalizeDate(source.startDate),
    endDate: normalizeDate(source.endDate),
    summary: normalizeMultilineText(source.summary),
    highlights: normalizeStringArray(source.highlights),
  };
  const highlights = normalized.highlights ?? [];

  if (
    !normalized.organization &&
    !normalized.position &&
    !normalized.url &&
    !normalized.startDate &&
    !normalized.endDate &&
    !normalized.summary &&
    highlights.length === 0
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeEducationEntry(entry: unknown): ResumeEducation | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeEducation) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeEducation = {
    id: ensureId(source.id),
    institution: normalizeInlineText(source.institution),
    url: normalizeUrl(source.url),
    area: normalizeInlineText(source.area),
    studyType: normalizeInlineText(source.studyType),
    startDate: normalizeDate(source.startDate),
    endDate: normalizeDate(source.endDate),
    score: normalizeInlineText(source.score),
    courses: normalizeStringArray(source.courses),
  };
  const courses = normalized.courses ?? [];

  if (
    !normalized.institution &&
    !normalized.url &&
    !normalized.area &&
    !normalized.studyType &&
    !normalized.startDate &&
    !normalized.endDate &&
    !normalized.score &&
    courses.length === 0
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeAwardEntry(entry: unknown): ResumeAward | undefined {
  const source = typeof entry === "object" && entry !== null ? (entry as ResumeAward) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeAward = {
    id: ensureId(source.id),
    title: normalizeInlineText(source.title),
    date: normalizeDate(source.date),
    awarder: normalizeInlineText(source.awarder),
    summary: normalizeMultilineText(source.summary),
  };

  if (!normalized.title && !normalized.date && !normalized.awarder && !normalized.summary) {
    return undefined;
  }

  return normalized;
}

function normalizeCertificateEntry(entry: unknown): ResumeCertificate | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeCertificate) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeCertificate = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    date: normalizeDate(source.date),
    issuer: normalizeInlineText(source.issuer),
    url: normalizeUrl(source.url),
  };

  if (!normalized.name && !normalized.date && !normalized.issuer && !normalized.url) {
    return undefined;
  }

  return normalized;
}

function normalizePublicationEntry(entry: unknown): ResumePublication | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumePublication) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumePublication = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    publisher: normalizeInlineText(source.publisher),
    releaseDate: normalizeDate(source.releaseDate),
    url: normalizeUrl(source.url),
    summary: normalizeMultilineText(source.summary),
  };

  if (
    !normalized.name &&
    !normalized.publisher &&
    !normalized.releaseDate &&
    !normalized.url &&
    !normalized.summary
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeSkillEntry(entry: unknown): ResumeSkill | undefined {
  const source = typeof entry === "object" && entry !== null ? (entry as ResumeSkill) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeSkill = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    level: normalizeInlineText(source.level),
    keywords: normalizeStringArray(source.keywords),
  };
  const keywords = normalized.keywords ?? [];

  if (!normalized.name && !normalized.level && keywords.length === 0) {
    return undefined;
  }

  return normalized;
}

function normalizeLanguageEntry(entry: unknown): ResumeLanguage | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeLanguage) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeLanguage = {
    id: ensureId(source.id),
    language: normalizeInlineText(source.language),
    fluency: normalizeInlineText(source.fluency),
  };

  if (!normalized.language && !normalized.fluency) {
    return undefined;
  }

  return normalized;
}

function normalizeInterestEntry(entry: unknown): ResumeInterest | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeInterest) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeInterest = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    keywords: normalizeStringArray(source.keywords),
  };
  const keywords = normalized.keywords ?? [];

  if (!normalized.name && keywords.length === 0) {
    return undefined;
  }

  return normalized;
}

function normalizeReferenceEntry(entry: unknown): ResumeReference | undefined {
  const source =
    typeof entry === "object" && entry !== null ? (entry as ResumeReference) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeReference = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    reference: normalizeMultilineText(source.reference),
  };

  if (!normalized.name && !normalized.reference) {
    return undefined;
  }

  return normalized;
}

function normalizeProjectEntry(entry: unknown): ResumeProject | undefined {
  const source = typeof entry === "object" && entry !== null ? (entry as ResumeProject) : undefined;

  if (!source) {
    return undefined;
  }

  const normalized: ResumeProject = {
    id: ensureId(source.id),
    name: normalizeInlineText(source.name),
    description: normalizeMultilineText(source.description),
    highlights: normalizeStringArray(source.highlights),
    keywords: normalizeStringArray(source.keywords),
    startDate: normalizeDate(source.startDate),
    endDate: normalizeDate(source.endDate),
    url: normalizeUrl(source.url),
    roles: normalizeStringArray(source.roles),
    entity: normalizeInlineText(source.entity),
    type: normalizeInlineText(source.type),
  };
  const highlights = normalized.highlights ?? [];
  const keywords = normalized.keywords ?? [];
  const roles = normalized.roles ?? [];

  if (
    !normalized.name &&
    !normalized.description &&
    highlights.length === 0 &&
    keywords.length === 0 &&
    !normalized.startDate &&
    !normalized.endDate &&
    !normalized.url &&
    roles.length === 0 &&
    !normalized.entity &&
    !normalized.type
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeSection<T>(section: unknown, normalizer: (entry: unknown) => T | undefined): T[] {
  if (!Array.isArray(section)) {
    return [];
  }

  return section.map((entry) => normalizer(entry)).filter(Boolean) as T[];
}

function countRenderableSectionEntries(resume: ResumeSchema): number {
  return (
    (resume.work?.length ?? 0) +
    (resume.volunteer?.length ?? 0) +
    (resume.education?.length ?? 0) +
    (resume.awards?.length ?? 0) +
    (resume.certificates?.length ?? 0) +
    (resume.publications?.length ?? 0) +
    (resume.skills?.length ?? 0) +
    (resume.languages?.length ?? 0) +
    (resume.interests?.length ?? 0) +
    (resume.references?.length ?? 0) +
    (resume.projects?.length ?? 0)
  );
}

export function normalizeResume(data: ResumeSchema): ResumeSchema {
  const source = typeof data === "object" && data !== null ? data : deepClone(EMPTY_RESUME);
  const normalizedBasics = normalizeBasics(source.basics);
  const normalizedLocation: ResumeLocation = normalizedBasics.location ?? {};

  return {
    ...deepClone(EMPTY_RESUME),
    ...source,
    basics: {
      ...deepClone(EMPTY_RESUME).basics,
      ...normalizedBasics,
      location: hasLocationContent(normalizedLocation)
        ? normalizedLocation
        : deepClone(EMPTY_RESUME).basics.location,
      profiles: normalizedBasics.profiles,
    },
    work: normalizeSection(source.work, normalizeWorkEntry),
    volunteer: normalizeSection(source.volunteer, normalizeVolunteerEntry),
    education: normalizeSection(source.education, normalizeEducationEntry),
    awards: normalizeSection(source.awards, normalizeAwardEntry),
    certificates: normalizeSection(source.certificates, normalizeCertificateEntry),
    publications: normalizeSection(source.publications, normalizePublicationEntry),
    skills: normalizeSection(source.skills, normalizeSkillEntry),
    languages: normalizeSection(source.languages, normalizeLanguageEntry),
    interests: normalizeSection(source.interests, normalizeInterestEntry),
    references: normalizeSection(source.references, normalizeReferenceEntry),
    projects: normalizeSection(source.projects, normalizeProjectEntry),
  };
}

export function serializeNormalizedResume(data: ResumeSchema): string {
  return JSON.stringify(normalizeResume(data));
}

export function validateResumeForExport(data: ResumeSchema): ResumeExportValidationResult {
  const normalizedResume = normalizeResume(data);

  if (!normalizedResume.basics.name) {
    return {
      ok: false,
      normalizedResume,
      message: "Add your name before exporting.",
    };
  }

  const hasSummary = Boolean(normalizedResume.basics.summary);
  const hasRenderableContent = countRenderableSectionEntries(normalizedResume) > 0;

  if (!hasSummary && !hasRenderableContent) {
    return {
      ok: false,
      normalizedResume,
      message:
        "Add a summary or at least one section like experience, volunteer work, education, awards, publications, skills, languages, interests, projects, references, or certifications before exporting.",
    };
  }

  return { ok: true, normalizedResume };
}
