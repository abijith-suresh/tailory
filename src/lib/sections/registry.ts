import type { EntrySection } from "@/lib/versions/items";
import type { ResumeSchema, SectionId } from "@/types/resume";

export interface SectionDefinition {
  readonly id: SectionId;
  /** The list of entries the section edits, if it edits one. */
  readonly entries?: EntrySection;
  readonly label: string;
  readonly isComplete: (resume: ResumeSchema) => boolean;
}

export const SECTION_DEFINITIONS: readonly SectionDefinition[] = [
  {
    id: "basics",
    label: "Basics",
    isComplete: (resume) => !!resume.basics.name,
  },
  {
    id: "summary",
    label: "Summary",
    isComplete: (resume) => !!resume.basics.summary,
  },
  {
    id: "work",
    entries: "work",
    label: "Work experience",
    isComplete: (resume) => (resume.work?.length ?? 0) > 0,
  },
  {
    id: "education",
    entries: "education",
    label: "Education",
    isComplete: (resume) => (resume.education?.length ?? 0) > 0,
  },
  {
    id: "skills",
    entries: "skills",
    label: "Skills",
    isComplete: (resume) => (resume.skills?.length ?? 0) > 0,
  },
  {
    id: "languages",
    entries: "languages",
    label: "Languages",
    isComplete: (resume) => (resume.languages?.length ?? 0) > 0,
  },
  {
    id: "interests",
    entries: "interests",
    label: "Interests",
    isComplete: (resume) => (resume.interests?.length ?? 0) > 0,
  },
  {
    id: "references",
    entries: "references",
    label: "References",
    isComplete: (resume) => (resume.references?.length ?? 0) > 0,
  },
  {
    id: "projects",
    entries: "projects",
    label: "Projects",
    isComplete: (resume) => (resume.projects?.length ?? 0) > 0,
  },
  {
    id: "certs",
    entries: "certificates",
    label: "Certifications",
    isComplete: (resume) => (resume.certificates?.length ?? 0) > 0,
  },
  {
    id: "volunteer",
    entries: "volunteer",
    label: "Volunteer",
    isComplete: (resume) => (resume.volunteer?.length ?? 0) > 0,
  },
  {
    id: "awards",
    entries: "awards",
    label: "Awards",
    isComplete: (resume) => (resume.awards?.length ?? 0) > 0,
  },
  {
    id: "publications",
    entries: "publications",
    label: "Publications",
    isComplete: (resume) => (resume.publications?.length ?? 0) > 0,
  },
] as const;

export const TOTAL_SECTIONS = SECTION_DEFINITIONS.length;

const SECTION_MAP = new Map<SectionId, SectionDefinition>(
  SECTION_DEFINITIONS.map((s) => [s.id, s])
);

export function getSectionDefinition(id: SectionId): SectionDefinition | undefined {
  return SECTION_MAP.get(id);
}

export function isSectionComplete(id: SectionId, resume: ResumeSchema): boolean {
  return SECTION_MAP.get(id)?.isComplete(resume) ?? false;
}

export function getCompletedSectionsCount(resume: ResumeSchema): number {
  let count = 0;
  for (const s of SECTION_DEFINITIONS) {
    if (s.isComplete(resume)) {
      count++;
    }
  }
  return count;
}

export function isResumeEmpty(resume: ResumeSchema): boolean {
  return getCompletedSectionsCount(resume) === 0;
}
