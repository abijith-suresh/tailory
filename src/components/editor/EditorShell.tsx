import { type Component, type JSX } from "solid-js";
import { activeSection } from "@/store/resume";
import type { SectionId } from "@/types/resume";
import BasicsForm from "./BasicsForm";
import SummaryForm from "./SummaryForm";
import WorkForm from "./WorkForm";
import EducationForm from "./EducationForm";
import SkillsForm from "./SkillsForm";
import ProjectsForm from "./ProjectsForm";
import CertificatesForm from "./CertificatesForm";

interface SectionMeta {
  id: SectionId;
  label: string;
  subtitle: string;
  component: () => JSX.Element;
}

const SECTIONS: SectionMeta[] = [
  {
    id: "basics",
    label: "Basic Info",
    subtitle: "Name, contact details, and headline",
    component: () => <BasicsForm />,
  },
  {
    id: "summary",
    label: "Summary",
    subtitle: "A brief professional overview",
    component: () => <SummaryForm />,
  },
  {
    id: "work",
    label: "Work Experience",
    subtitle: "Jobs, roles, and accomplishments",
    component: () => <WorkForm />,
  },
  {
    id: "education",
    label: "Education",
    subtitle: "Degrees, institutions, and dates",
    component: () => <EducationForm />,
  },
  {
    id: "skills",
    label: "Skills",
    subtitle: "Technical and professional skills",
    component: () => <SkillsForm />,
  },
  {
    id: "projects",
    label: "Projects",
    subtitle: "Personal and professional projects",
    component: () => <ProjectsForm />,
  },
  {
    id: "certs",
    label: "Certifications",
    subtitle: "Licenses, certificates, and credentials",
    component: () => <CertificatesForm />,
  },
];

const EditorShell: Component = () => {
  const currentSection = () => SECTIONS.find((s) => s.id === activeSection());

  return (
    <div class="flex h-full flex-col" style={{ background: "#f4f8f5" }}>
      {/* Section header */}
      <div
        class="shrink-0 border-b px-6 py-4"
        style={{ background: "#ffffff", "border-color": "#ccddd4" }}
      >
        <h2 class="text-base font-semibold" style={{ color: "#0e2418", "font-family": "'Lora', serif" }}>
          {currentSection()?.label}
        </h2>
        <p class="mt-0.5 text-xs" style={{ color: "#5a7a68" }}>
          {currentSection()?.subtitle}
        </p>
      </div>

      {/* Form area */}
      <div
        id={`panel-${activeSection()}`}
        role="tabpanel"
        aria-label={currentSection()?.label}
        class="flex-1 overflow-y-auto p-6"
      >
        {currentSection()?.component()}
      </div>
    </div>
  );
};

export default EditorShell;
