import type {
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeInterest,
  ResumeLanguage,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeSchema,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from "../types/resume.ts";
import { normalizeResume } from "./normalize.ts";

export const JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELDS = [
  "basics",
  "work",
  "volunteer",
  "education",
  "awards",
  "certificates",
  "publications",
  "skills",
  "languages",
  "interests",
  "references",
  "projects",
] as const;

const JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELD_SET = new Set<string>(
  JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELDS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureArray(value: unknown, fieldName: string): unknown[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  throw new Error(`Invalid JSON Resume: '${fieldName}' must be an array.`);
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseBasics(input: unknown): Record<string, unknown> {
  if (input === undefined) {
    return {};
  }

  if (!isRecord(input)) {
    throw new Error("Invalid JSON Resume: 'basics' must be an object.");
  }

  const location = isRecord(input.location)
    ? {
        address: parseString(input.location.address),
        postalCode: parseString(input.location.postalCode),
        city: parseString(input.location.city),
        countryCode: parseString(input.location.countryCode),
        region: parseString(input.location.region),
      }
    : undefined;

  const profiles = Array.isArray(input.profiles)
    ? input.profiles.filter(isRecord).map((profile) => ({
        network: parseString(profile.network),
        username: parseString(profile.username),
        url: parseString(profile.url),
      }))
    : undefined;

  return {
    name: parseString(input.name),
    label: parseString(input.label),
    image: parseString(input.image),
    email: parseString(input.email),
    phone: parseString(input.phone),
    url: parseString(input.url),
    summary: parseString(input.summary),
    location,
    profiles,
  };
}

function parseObjectArray<T>(
  value: unknown,
  fieldName: string,
  mapEntry: (entry: Record<string, unknown>) => Partial<T>
): Partial<T>[] {
  return ensureArray(value, fieldName).map((entry) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid JSON Resume: each '${fieldName}' entry must be an object.`);
    }

    return mapEntry(entry);
  });
}

export function parseJsonResumeString(source: string): ResumeSchema {
  return parseJsonResumeDocument(parseJsonSource(source));
}

function parseJsonSource(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    throw new Error("Invalid JSON file. Please upload a valid JSON Resume document.");
  }
}

/**
 * Top-level fields Tailory does not model (`meta`, `$schema`, custom keys). Import skips
 * them and the caller reports the names, so the user knows what was left out.
 */
function findIgnoredTopLevelFields(document: Record<string, unknown>): string[] {
  return Object.keys(document).filter((key) => !JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELD_SET.has(key));
}

export interface JsonResumeImport {
  resume: ResumeSchema;
  ignoredFields: string[];
}

export function parseJsonResumeImport(source: string): JsonResumeImport {
  const document = parseJsonSource(source);
  const resume = parseJsonResumeDocument(document);

  return { resume, ignoredFields: isRecord(document) ? findIgnoredTopLevelFields(document) : [] };
}

export function parseJsonResumeDocument(document: unknown): ResumeSchema {
  if (!isRecord(document)) {
    throw new Error("Invalid JSON Resume: top-level document must be an object.");
  }

  const normalized = normalizeResume({
    basics: parseBasics(document.basics),
    work: parseObjectArray(document.work, "work", (entry) => ({
      name: parseString(entry.name),
      position: parseString(entry.position),
      url: parseString(entry.url),
      startDate: parseString(entry.startDate),
      endDate: parseString(entry.endDate),
      summary: parseString(entry.summary),
      highlights: Array.isArray(entry.highlights)
        ? entry.highlights.filter((value): value is string => typeof value === "string")
        : undefined,
    })) as ResumeSchema["work"],
    volunteer: parseObjectArray(document.volunteer, "volunteer", (entry) => ({
      organization: parseString(entry.organization),
      position: parseString(entry.position),
      url: parseString(entry.url),
      startDate: parseString(entry.startDate),
      endDate: parseString(entry.endDate),
      summary: parseString(entry.summary),
      highlights: Array.isArray(entry.highlights)
        ? entry.highlights.filter((value): value is string => typeof value === "string")
        : undefined,
    })) as ResumeSchema["volunteer"],
    education: parseObjectArray(document.education, "education", (entry) => ({
      institution: parseString(entry.institution),
      url: parseString(entry.url),
      area: parseString(entry.area),
      studyType: parseString(entry.studyType),
      startDate: parseString(entry.startDate),
      endDate: parseString(entry.endDate),
      score: parseString(entry.score),
      courses: Array.isArray(entry.courses)
        ? entry.courses.filter((value): value is string => typeof value === "string")
        : undefined,
    })) as ResumeSchema["education"],
    awards: parseObjectArray(document.awards, "awards", (entry) => ({
      title: parseString(entry.title),
      date: parseString(entry.date),
      awarder: parseString(entry.awarder),
      summary: parseString(entry.summary),
    })) as ResumeSchema["awards"],
    certificates: parseObjectArray(document.certificates, "certificates", (entry) => ({
      name: parseString(entry.name),
      date: parseString(entry.date),
      issuer: parseString(entry.issuer),
      url: parseString(entry.url),
    })) as ResumeSchema["certificates"],
    publications: parseObjectArray(document.publications, "publications", (entry) => ({
      name: parseString(entry.name),
      publisher: parseString(entry.publisher),
      releaseDate: parseString(entry.releaseDate),
      url: parseString(entry.url),
      summary: parseString(entry.summary),
    })) as ResumeSchema["publications"],
    skills: parseObjectArray(document.skills, "skills", (entry) => ({
      name: parseString(entry.name),
      level: parseString(entry.level),
      keywords: Array.isArray(entry.keywords)
        ? entry.keywords.filter((value): value is string => typeof value === "string")
        : undefined,
    })) as ResumeSchema["skills"],
    languages: parseObjectArray(document.languages, "languages", (entry) => ({
      language: parseString(entry.language),
      fluency: parseString(entry.fluency),
    })) as ResumeSchema["languages"],
    interests: parseObjectArray(document.interests, "interests", (entry) => ({
      name: parseString(entry.name),
      keywords: Array.isArray(entry.keywords)
        ? entry.keywords.filter((value): value is string => typeof value === "string")
        : undefined,
    })) as ResumeSchema["interests"],
    references: parseObjectArray(document.references, "references", (entry) => ({
      name: parseString(entry.name),
      reference: parseString(entry.reference),
    })) as ResumeSchema["references"],
    projects: parseObjectArray(document.projects, "projects", (entry) => ({
      name: parseString(entry.name),
      description: parseString(entry.description),
      highlights: Array.isArray(entry.highlights)
        ? entry.highlights.filter((value): value is string => typeof value === "string")
        : undefined,
      keywords: Array.isArray(entry.keywords)
        ? entry.keywords.filter((value): value is string => typeof value === "string")
        : undefined,
      startDate: parseString(entry.startDate),
      endDate: parseString(entry.endDate),
      url: parseString(entry.url),
      roles: Array.isArray(entry.roles)
        ? entry.roles.filter((value): value is string => typeof value === "string")
        : undefined,
      entity: parseString(entry.entity),
      type: parseString(entry.type),
    })) as ResumeSchema["projects"],
  } as unknown as ResumeSchema);

  if (!normalized.basics.name && !normalized.basics.email && !normalized.basics.label) {
    throw new Error(
      "Invalid JSON Resume: add at least basic identity fields like name, email, or label."
    );
  }

  return normalized;
}

function stripEmptyStringValues<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")
  ) as Partial<T>;
}

function exportBasics(basics: ResumeSchema["basics"]): Record<string, unknown> {
  const location = stripEmptyStringValues({
    address: basics.location?.address,
    postalCode: basics.location?.postalCode,
    city: basics.location?.city,
    countryCode: basics.location?.countryCode,
    region: basics.location?.region,
  });

  return stripEmptyStringValues({
    name: basics.name,
    label: basics.label,
    image: basics.image,
    email: basics.email,
    phone: basics.phone,
    url: basics.url,
    summary: basics.summary,
    location: Object.keys(location).length > 0 ? location : undefined,
    profiles:
      basics.profiles
        ?.map((profile) =>
          stripEmptyStringValues({
            network: profile.network,
            username: profile.username,
            url: profile.url,
          })
        )
        .filter((profile) => Object.keys(profile).length > 0) ?? undefined,
  });
}

const MONTH_NAMES = [
  ["jan", "january"],
  ["feb", "february"],
  ["mar", "march"],
  ["apr", "april"],
  ["may", "may"],
  ["jun", "june"],
  ["jul", "july"],
  ["aug", "august"],
  ["sep", "september"],
  ["oct", "october"],
  ["nov", "november"],
  ["dec", "december"],
] as const;

const MONTH_NUMBERS = new Map<string, string>(
  MONTH_NAMES.flatMap(([short, long], index) => {
    const month = String(index + 1).padStart(2, "0");
    return [
      [short, month],
      [long, month],
    ] as const;
  })
);
MONTH_NUMBERS.set("sept", "09");

const PRESENT_DATE_RE = /^(present|current|now)$/i;
const ISO_PARTIAL_DATE_RE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;
const ISO_YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;
const SLASH_MONTH_YEAR_RE = /^(\d{1,2})\/(\d{4})$/;
const MONTH_NAME_YEAR_RE = /^([a-z]+)\.?\s*,?\s*(\d{4})$/i;
const DATE_FIELDS = new Set(["startDate", "endDate", "date", "releaseDate"]);

function formatMonth(month: number): string | undefined {
  return month >= 1 && month <= 12 ? String(month).padStart(2, "0") : undefined;
}

/**
 * Converts a stored free-text date to a JSON Resume ISO 8601 partial date
 * (YYYY, YYYY-MM, YYYY-MM-DD). Anything that cannot be read unambiguously is
 * returned unchanged instead of being guessed.
 */
function toJsonResumeDate(value: string): string {
  const trimmed = value.trim();

  if (ISO_PARTIAL_DATE_RE.test(trimmed)) {
    const yearMonth = trimmed.match(ISO_YEAR_MONTH_RE);
    return yearMonth && !formatMonth(Number(yearMonth[2])) ? value : trimmed;
  }

  const slash = trimmed.match(SLASH_MONTH_YEAR_RE);
  if (slash) {
    const month = formatMonth(Number(slash[1]));
    return month ? `${slash[2]}-${month}` : value;
  }

  const named = trimmed.match(MONTH_NAME_YEAR_RE);
  if (named) {
    const month = MONTH_NUMBERS.get(named[1]?.toLowerCase() ?? "");
    return month ? `${named[2]}-${month}` : value;
  }

  return value;
}

function exportEntry<T extends { id: string }>(entry: T): Record<string, unknown> {
  const { id: _id, ...rest } = entry;
  const exported: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string" && DATE_FIELDS.has(key)) {
      if (key === "endDate" && PRESENT_DATE_RE.test(value.trim())) {
        continue;
      }

      exported[key] = toJsonResumeDate(value);
      continue;
    }

    exported[key] = value;
  }

  return exported;
}

function stripIds<T extends { id: string }>(
  entries: T[] | undefined
): Array<Record<string, unknown>> | undefined {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  return entries.map(exportEntry);
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (isRecord(value) && Object.keys(value).length === 0)
  );
}

function pruneEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty).filter((entry) => !isEmptyValue(entry));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, pruneEmpty(entry)] as const)
        .filter(([, entry]) => !isEmptyValue(entry))
    );
  }

  return value;
}

export function exportJsonResumeDocument(resume: ResumeSchema): Record<string, unknown> {
  const normalized = normalizeResume(resume);

  return pruneEmpty({
    basics: exportBasics(normalized.basics),
    work: stripIds<ResumeWork>(normalized.work),
    volunteer: stripIds<ResumeVolunteer>(normalized.volunteer),
    education: stripIds<ResumeEducation>(normalized.education),
    awards: stripIds<ResumeAward>(normalized.awards),
    certificates: stripIds<ResumeCertificate>(normalized.certificates),
    publications: stripIds<ResumePublication>(normalized.publications),
    skills: stripIds<ResumeSkill>(normalized.skills),
    languages: stripIds<ResumeLanguage>(normalized.languages),
    interests: stripIds<ResumeInterest>(normalized.interests),
    references: stripIds<ResumeReference>(normalized.references),
    projects: stripIds<ResumeProject>(normalized.projects),
  }) as Record<string, unknown>;
}

export function exportJsonResumeString(resume: ResumeSchema): string {
  return JSON.stringify(exportJsonResumeDocument(resume), null, 2);
}
