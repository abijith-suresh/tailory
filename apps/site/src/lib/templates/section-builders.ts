import { formatDateRange, joinDefined } from "@/lib/export/template-helpers";
import type {
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeVolunteer,
  ResumeWork,
} from "@/types/resume";

import type { ResumeEntryModel, ResumeSectionModel } from "./render-model";

type SectionId = ResumeSectionModel["id"];

type SectionDividerOption = Pick<ResumeSectionModel, "dividerAfter">;

type EntryLayoutOptions = {
  spacerAfter?: number;
  subtitleMode?: ResumeEntryModel["subtitleMode"];
};

interface TextSectionOptions extends SectionDividerOption {
  id: Extract<SectionId, "summary" | "skills" | "languages" | "interests">;
  text: string | undefined;
  title: string;
}

interface EntrySectionOptions<T> extends EntryLayoutOptions, SectionDividerOption {
  entries: T[] | undefined;
  id: Exclude<SectionId, "summary" | "skills" | "languages" | "interests">;
  mapEntry: (entry: T) => ResumeEntryModel;
  title: string;
}

interface RoleSectionOptions extends EntryLayoutOptions, SectionDividerOption {
  title: string;
}

interface PublicationSectionOptions extends EntryLayoutOptions, SectionDividerOption {
  resolveLink?: (url?: string) => string | undefined;
  title: string;
}

interface ProjectSectionOptions extends EntryLayoutOptions, SectionDividerOption {
  resolveLink?: (url?: string) => string | undefined;
  resolveMeta?: (project: ResumeProject) => string | undefined;
  title: string;
}

function hasEntries<T>(entries: T[] | undefined): entries is T[] {
  return Array.isArray(entries) && entries.length > 0;
}

function buildEntriesSection<T>(options: EntrySectionOptions<T>): ResumeSectionModel | null {
  if (!hasEntries(options.entries)) {
    return null;
  }

  return {
    id: options.id,
    kind: "entries",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: options.entries.map(options.mapEntry),
  };
}

function buildRoleEntriesSection<T extends ResumeWork | ResumeVolunteer>(
  options: RoleSectionOptions & {
    entries: T[] | undefined;
    getTitle: (entry: T) => string;
    id: Extract<SectionId, "work" | "volunteer">;
  }
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: options.id,
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: options.entries,
    mapEntry: (entry) => ({
      title: options.getTitle(entry),
      subtitle: entry.position,
      subtitleMode: options.subtitleMode,
      meta: formatDateRange(entry.startDate, entry.endDate),
      body: entry.summary,
      bullets: entry.highlights,
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildTextSection(options: TextSectionOptions): ResumeSectionModel | null {
  if (!options.text) {
    return null;
  }

  return {
    id: options.id,
    kind: "text",
    title: options.title,
    text: options.text,
    dividerAfter: options.dividerAfter,
  };
}

export function buildWorkSection(
  work: ResumeWork[] | undefined,
  options: RoleSectionOptions
): ResumeSectionModel | null {
  return buildRoleEntriesSection({
    id: "work",
    entries: work,
    title: options.title,
    dividerAfter: options.dividerAfter,
    subtitleMode: options.subtitleMode,
    spacerAfter: options.spacerAfter,
    getTitle: (entry) => entry.name,
  });
}

export function buildVolunteerSection(
  volunteer: ResumeVolunteer[] | undefined,
  options: RoleSectionOptions
): ResumeSectionModel | null {
  return buildRoleEntriesSection({
    id: "volunteer",
    entries: volunteer,
    title: options.title,
    dividerAfter: options.dividerAfter,
    subtitleMode: options.subtitleMode,
    spacerAfter: options.spacerAfter,
    getTitle: (entry) => entry.organization,
  });
}

export function buildEducationSection(
  education: ResumeEducation[] | undefined,
  options: RoleSectionOptions
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "education",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: education,
    mapEntry: (entry) => ({
      title: entry.institution,
      subtitle: joinDefined([entry.studyType, entry.area], ", "),
      subtitleMode: options.subtitleMode,
      meta: formatDateRange(entry.startDate, entry.endDate),
      details: entry.score ? [`GPA: ${entry.score}`] : undefined,
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildAwardsSection(
  awards: ResumeAward[] | undefined,
  options: RoleSectionOptions
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "awards",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: awards,
    mapEntry: (entry) => ({
      title: entry.title,
      subtitle: entry.awarder,
      subtitleMode: options.subtitleMode,
      meta: entry.date,
      body: entry.summary,
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildPublicationsSection(
  publications: ResumePublication[] | undefined,
  options: PublicationSectionOptions
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "publications",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: publications,
    mapEntry: (entry) => ({
      title: entry.name,
      subtitle: entry.publisher,
      subtitleMode: options.subtitleMode,
      meta: entry.releaseDate,
      body: entry.summary,
      link: options.resolveLink?.(entry.url),
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildProjectsSection(
  projects: ResumeProject[] | undefined,
  options: ProjectSectionOptions
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "projects",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: projects,
    mapEntry: (entry) => ({
      title: entry.name,
      meta: options.resolveMeta?.(entry),
      body: entry.description,
      bullets: entry.highlights,
      link: options.resolveLink?.(entry.url),
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildReferencesSection(
  references: ResumeReference[] | undefined,
  options: SectionDividerOption & Pick<EntryLayoutOptions, "spacerAfter"> & { title: string }
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "references",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: references,
    mapEntry: (entry) => ({
      title: entry.name,
      body: entry.reference,
      spacerAfter: options.spacerAfter,
    }),
  });
}

export function buildCertificatesSection(
  certificates: ResumeCertificate[] | undefined,
  options: RoleSectionOptions
): ResumeSectionModel | null {
  return buildEntriesSection({
    id: "certificates",
    title: options.title,
    dividerAfter: options.dividerAfter,
    entries: certificates,
    mapEntry: (entry) => ({
      title: entry.name,
      subtitle: entry.issuer,
      subtitleMode: options.subtitleMode,
      meta: entry.date,
      spacerAfter: options.spacerAfter,
    }),
  });
}
