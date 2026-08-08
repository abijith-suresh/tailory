import { type Component, type JSX, Show } from "solid-js";
import { Transition } from "solid-transition-group";

import { activeSection, setActiveSection } from "@/store/resume";
import type { SectionId } from "@/types/resume";
import BasicsForm from "./BasicsForm";
import CertificatesForm from "./CertificatesForm";
import EducationForm from "./EducationForm";
import InterestsForm from "./InterestsForm";
import LanguagesForm from "./LanguagesForm";
import ProjectsForm from "./ProjectsForm";
import ReferencesForm from "./ReferencesForm";
import SkillsForm from "./SkillsForm";
import SummaryForm from "./SummaryForm";
import WorkForm from "./WorkForm";

interface SectionMeta {
  component: () => JSX.Element;
  id: SectionId;
  label: string;
  subtitle: string;
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
    id: "languages",
    label: "Languages",
    subtitle: "Languages and fluency levels",
    component: () => <LanguagesForm />,
  },
  {
    id: "interests",
    label: "Interests",
    subtitle: "Communities, hobbies, and focus areas",
    component: () => <InterestsForm />,
  },
  {
    id: "references",
    label: "References",
    subtitle: "People who can vouch for your work",
    component: () => <ReferencesForm />,
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

// ── EditorShell ──────────────────────────────────────────────────────────────

const EditorShell: Component = () => {
  const currentSection = () => SECTIONS.find((s) => s.id === activeSection());
  const currentIndex = () => SECTIONS.findIndex((s) => s.id === activeSection());
  const prevSection = () => (currentIndex() > 0 ? SECTIONS[currentIndex() - 1] : null);
  const nextSection = () =>
    currentIndex() < SECTIONS.length - 1 ? SECTIONS[currentIndex() + 1] : null;

  return (
    <div class="flex h-full flex-col" style={{ background: "#f4f8f5" }}>
      {/* Section header */}
      <div
        class="shrink-0 border-b px-6 py-3"
        style={{ background: "#ffffff", "border-color": "#ccddd4" }}
      >
        {/* Section title */}
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <h2
              class="text-base font-semibold"
              style={{ color: "#0e2418", "font-family": "'Lora', serif" }}
            >
              {currentSection()?.label}
            </h2>
            <p class="mt-0.5 text-xs" style={{ color: "#5a7a68" }}>
              {currentSection()?.subtitle}
            </p>
          </div>

          {/* Mobile prev/next navigation — hidden on md+ (desktop has chips in CommandBar) */}
          <div class="ml-3 flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={() => prevSection() && setActiveSection(prevSection()!.id)}
              disabled={!prevSection()}
              aria-label={prevSection() ? `Go to ${prevSection()!.label}` : "First section"}
              class="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
              style={{ color: "#1d6648" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span class="min-w-[3rem] text-center text-xs font-medium" style={{ color: "#5a7a68" }}>
              {currentIndex() + 1}/{SECTIONS.length}
            </span>
            <button
              type="button"
              onClick={() => nextSection() && setActiveSection(nextSection()!.id)}
              disabled={!nextSection()}
              aria-label={nextSection() ? `Go to ${nextSection()!.label}` : "Last section"}
              class="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
              style={{ color: "#1d6648" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form area */}
      <div
        id={`panel-${activeSection()}`}
        role="tabpanel"
        aria-label={currentSection()?.label}
        class="relative flex-1 overflow-y-auto"
      >
        <Transition name="section" mode="outin">
          <Show when={currentSection()} keyed>
            {(section) => <div class="p-6">{section.component()}</div>}
          </Show>
        </Transition>
      </div>
    </div>
  );
};

export default EditorShell;
