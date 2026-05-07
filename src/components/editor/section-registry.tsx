import type { JSX } from "solid-js";

import type { EditorSectionId, ResumeSchema, SupportedSectionId } from "@/types/resume";
import BasicsForm from "./BasicsForm";
import CertificatesForm from "./CertificatesForm";
import EducationForm from "./EducationForm";
import ProjectsForm from "./ProjectsForm";
import SkillsForm from "./SkillsForm";
import SummaryForm from "./SummaryForm";
import WorkForm from "./WorkForm";

export interface ResumeSectionDefinition {
  component?: () => JSX.Element;
  id: SupportedSectionId;
  isComplete: (resume: ResumeSchema) => boolean;
  label: string;
  navLabel: string;
  subtitle: string;
}

export interface EditableResumeSectionDefinition extends ResumeSectionDefinition {
  component: () => JSX.Element;
  id: EditorSectionId;
}

export const SECTION_REGISTRY: ResumeSectionDefinition[] = [
  {
    id: "basics",
    label: "Basic Info",
    navLabel: "Basics",
    subtitle: "Name, contact details, and headline",
    component: () => <BasicsForm />,
    isComplete: (resume) => !!resume.basics.name,
  },
  {
    id: "summary",
    label: "Summary",
    navLabel: "Summary",
    subtitle: "A brief professional overview",
    component: () => <SummaryForm />,
    isComplete: (resume) => !!resume.basics.summary,
  },
  {
    id: "work",
    label: "Work Experience",
    navLabel: "Work",
    subtitle: "Jobs, roles, and accomplishments",
    component: () => <WorkForm />,
    isComplete: (resume) => (resume.work?.length ?? 0) > 0,
  },
  {
    id: "volunteer",
    label: "Volunteer",
    navLabel: "Volunteer",
    subtitle: "Community work, service, and contributions",
    component: undefined,
    isComplete: (resume) => (resume.volunteer?.length ?? 0) > 0,
  },
  {
    id: "education",
    label: "Education",
    navLabel: "Education",
    subtitle: "Degrees, institutions, and dates",
    component: () => <EducationForm />,
    isComplete: (resume) => (resume.education?.length ?? 0) > 0,
  },
  {
    id: "awards",
    label: "Awards",
    navLabel: "Awards",
    subtitle: "Honors, recognition, and distinctions",
    component: undefined,
    isComplete: (resume) => (resume.awards?.length ?? 0) > 0,
  },
  {
    id: "publications",
    label: "Publications",
    navLabel: "Publications",
    subtitle: "Articles, papers, talks, and published work",
    component: undefined,
    isComplete: (resume) => (resume.publications?.length ?? 0) > 0,
  },
  {
    id: "skills",
    label: "Skills",
    navLabel: "Skills",
    subtitle: "Technical and professional skills",
    component: () => <SkillsForm />,
    isComplete: (resume) => (resume.skills?.length ?? 0) > 0,
  },
  {
    id: "languages",
    label: "Languages",
    navLabel: "Languages",
    subtitle: "Languages and fluency levels",
    component: undefined,
    isComplete: (resume) => (resume.languages?.length ?? 0) > 0,
  },
  {
    id: "interests",
    label: "Interests",
    navLabel: "Interests",
    subtitle: "Communities, hobbies, and focus areas",
    component: undefined,
    isComplete: (resume) => (resume.interests?.length ?? 0) > 0,
  },
  {
    id: "projects",
    label: "Projects",
    navLabel: "Projects",
    subtitle: "Personal and professional projects",
    component: () => <ProjectsForm />,
    isComplete: (resume) => (resume.projects?.length ?? 0) > 0,
  },
  {
    id: "references",
    label: "References",
    navLabel: "References",
    subtitle: "People who can vouch for your work",
    component: undefined,
    isComplete: (resume) => (resume.references?.length ?? 0) > 0,
  },
  {
    id: "certificates",
    label: "Certifications",
    navLabel: "Certs",
    subtitle: "Licenses, certificates, and credentials",
    component: () => <CertificatesForm />,
    isComplete: (resume) => (resume.certificates?.length ?? 0) > 0,
  },
];

export const COMPLETION_SECTIONS = SECTION_REGISTRY;

export const EDITOR_SECTIONS = SECTION_REGISTRY.filter(
  (section): section is EditableResumeSectionDefinition => typeof section.component === "function"
);

export function getSectionDefinition(id: SupportedSectionId): ResumeSectionDefinition | undefined {
  return SECTION_REGISTRY.find((section) => section.id === id);
}

export function getEditorSectionDefinition(
  id: EditorSectionId
): EditableResumeSectionDefinition | undefined {
  return EDITOR_SECTIONS.find((section) => section.id === id);
}

export function getSectionCompletionSummary(resume: ResumeSchema): {
  completed: number;
  completedSectionIds: SupportedSectionId[];
  total: number;
} {
  const completedSections = COMPLETION_SECTIONS.filter((section) => section.isComplete(resume));

  return {
    completed: completedSections.length,
    completedSectionIds: completedSections.map((section) => section.id),
    total: COMPLETION_SECTIONS.length,
  };
}

export function isResumeVisuallyEmpty(resume: ResumeSchema): boolean {
  return getSectionCompletionSummary(resume).completed === 0;
}
