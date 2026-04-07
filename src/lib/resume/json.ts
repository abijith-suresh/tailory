import { normalizeResume } from "@/lib/resume/normalize";
import type {
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeLanguage,
  ResumeProject,
  ResumePublication,
  ResumeSchema,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from "@/types/resume";

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
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Invalid JSON file. Please upload a valid JSON Resume document.");
  }

  return parseJsonResumeDocument(parsed);
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

function stripIds<T extends { id: string }>(
  entries: T[] | undefined
): Array<Omit<T, "id">> | undefined {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  return entries.map(({ id: _id, ...entry }) => entry);
}

function pruneEmptySections(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document).filter(([, value]) => {
      if (value === undefined) {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (isRecord(value)) {
        return Object.keys(value).length > 0;
      }

      return value !== "";
    })
  );
}

export function exportJsonResumeDocument(resume: ResumeSchema): Record<string, unknown> {
  const normalized = normalizeResume(resume);

  return pruneEmptySections({
    basics: exportBasics(normalized.basics),
    work: stripIds<ResumeWork>(normalized.work),
    volunteer: stripIds<ResumeVolunteer>(normalized.volunteer),
    education: stripIds<ResumeEducation>(normalized.education),
    awards: stripIds<ResumeAward>(normalized.awards),
    certificates: stripIds<ResumeCertificate>(normalized.certificates),
    publications: stripIds<ResumePublication>(normalized.publications),
    skills: stripIds<ResumeSkill>(normalized.skills),
    languages: stripIds<ResumeLanguage>(normalized.languages),
    projects: stripIds<ResumeProject>(normalized.projects),
  });
}

export function exportJsonResumeString(resume: ResumeSchema): string {
  return JSON.stringify(exportJsonResumeDocument(resume), null, 2);
}
