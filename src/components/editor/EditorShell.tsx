import { type Component, createEffect, createSignal, type JSX, Show } from "solid-js";
import { Transition } from "solid-transition-group";

import { activeSection, importFeedback, setActiveSection, setImportFeedback } from "@/store/resume";
import type { SectionId } from "@/types/resume";
import BasicsForm from "./BasicsForm";
import CertificatesForm from "./CertificatesForm";
import EducationForm from "./EducationForm";
import ProjectsForm from "./ProjectsForm";
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

// ── Confidence Toast ─────────────────────────────────────────────────────────

function confidenceLabel(score: number): string {
  if (score >= 0.8) return "High confidence";
  if (score >= 0.5) return "Medium confidence";
  return "Low confidence — review carefully";
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return "#1d6648";
  if (score >= 0.5) return "#b45309";
  return "#b91c1c";
}

function confidenceBg(score: number): string {
  if (score >= 0.8) return "#edf4f0";
  if (score >= 0.5) return "#fffbeb";
  return "#fef2f2";
}

function confidenceBorder(score: number): string {
  if (score >= 0.8) return "#ccddd4";
  if (score >= 0.5) return "#fcd34d";
  return "#fca5a5";
}

const ImportToast: Component = () => {
  const [visible, setVisible] = createSignal(false);

  createEffect(() => {
    const fb = importFeedback();
    if (!fb) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setImportFeedback(null);
    }, 5000);
    return () => clearTimeout(timer);
  });

  return (
    <Show when={visible() && importFeedback()}>
      {(_) => {
        const fb = importFeedback()!;
        const parts: string[] = [];
        if (fb.work > 0) parts.push(`${fb.work} job${fb.work > 1 ? "s" : ""}`);
        if (fb.education > 0) parts.push(`${fb.education} degree${fb.education > 1 ? "s" : ""}`);
        if (fb.skills > 0) parts.push(`${fb.skills} skill${fb.skills > 1 ? "s" : ""}`);
        if (fb.projects > 0) parts.push(`${fb.projects} project${fb.projects > 1 ? "s" : ""}`);
        if (fb.certificates > 0)
          parts.push(`${fb.certificates} cert${fb.certificates > 1 ? "s" : ""}`);

        return (
          <div
            role="status"
            aria-live="polite"
            class="mx-6 mt-4 flex items-start justify-between gap-3 rounded-md px-3.5 py-2.5 text-xs leading-snug"
            style={{
              background: confidenceBg(fb.confidence),
              border: `1px solid ${confidenceBorder(fb.confidence)}`,
              color: confidenceColor(fb.confidence),
            }}
          >
            <div>
              <span class="font-semibold">{confidenceLabel(fb.confidence)}</span>
              {parts.length > 0 && (
                <span class="ml-1 opacity-80">— imported {parts.join(", ")}.</span>
              )}
              {parts.length === 0 && (
                <span class="ml-1 opacity-80">— check each section for accuracy.</span>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                setVisible(false);
                setImportFeedback(null);
              }}
              class="shrink-0 opacity-60 transition-opacity hover:opacity-100"
              style={{ color: confidenceColor(fb.confidence) }}
            >
              ✕
            </button>
          </div>
        );
      }}
    </Show>
  );
};

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

      {/* Import confidence toast */}
      <ImportToast />

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
