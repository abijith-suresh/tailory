import type { ResumeSchema, SectionId } from "@/types/resume";

export interface SectionDefinition {
  readonly id: SectionId;
  readonly label: string;
  readonly shortLabel: string;
  readonly subtitle: string;
  readonly isComplete: (resume: ResumeSchema) => boolean;
}

export const SECTION_DEFINITIONS: readonly SectionDefinition[] = [
  {
    id: "basics",
    label: "Basic Info",
    shortLabel: "Basics",
    subtitle: "Name, contact details, and headline",
    isComplete: (resume) => !!resume.basics.name,
  },
  {
    id: "summary",
    label: "Summary",
    shortLabel: "Summary",
    subtitle: "A brief professional overview",
    isComplete: (resume) => !!resume.basics.summary,
  },
  {
    id: "work",
    label: "Work Experience",
    shortLabel: "Work",
    subtitle: "Jobs, roles, and accomplishments",
    isComplete: (resume) => (resume.work?.length ?? 0) > 0,
  },
  {
    id: "education",
    label: "Education",
    shortLabel: "Education",
    subtitle: "Degrees, institutions, and dates",
    isComplete: (resume) => (resume.education?.length ?? 0) > 0,
  },
  {
    id: "skills",
    label: "Skills",
    shortLabel: "Skills",
    subtitle: "Technical and professional skills",
    isComplete: (resume) => (resume.skills?.length ?? 0) > 0,
  },
  {
    id: "languages",
    label: "Languages",
    shortLabel: "Languages",
    subtitle: "Languages and fluency levels",
    isComplete: (resume) => (resume.languages?.length ?? 0) > 0,
  },
  {
    id: "interests",
    label: "Interests",
    shortLabel: "Interests",
    subtitle: "Communities, hobbies, and focus areas",
    isComplete: (resume) => (resume.interests?.length ?? 0) > 0,
  },
  {
    id: "references",
    label: "References",
    shortLabel: "References",
    subtitle: "People who can vouch for your work",
    isComplete: (resume) => (resume.references?.length ?? 0) > 0,
  },
  {
    id: "projects",
    label: "Projects",
    shortLabel: "Projects",
    subtitle: "Personal and professional projects",
    isComplete: (resume) => (resume.projects?.length ?? 0) > 0,
  },
  {
    id: "certs",
    label: "Certifications",
    shortLabel: "Certs",
    subtitle: "Licenses, certificates, and credentials",
    isComplete: (resume) => (resume.certificates?.length ?? 0) > 0,
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
