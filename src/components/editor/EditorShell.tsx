import { type Component, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { outlineButton } from "@/components/ui/buttons";
import { Plus } from "@/components/ui/icons";
import { getSectionDefinition, SECTION_DEFINITIONS } from "@/lib/sections/registry";
import { countKept } from "@/lib/versions/counts";
import { versions } from "@/store/document";
import { activeVersion, setVersionDialog } from "@/store/editor";
import { activeSection, resume, setActiveSection } from "@/store/resume";
import type { SectionId } from "@/types/resume";
import AwardsForm from "./AwardsForm";
import BasicsForm from "./BasicsForm";
import CertificatesForm from "./CertificatesForm";
import EducationForm from "./EducationForm";
import InterestsForm from "./InterestsForm";
import LanguagesForm from "./LanguagesForm";
import PageFit from "./PageFit";
import ProjectsForm from "./ProjectsForm";
import PublicationsForm from "./PublicationsForm";
import ReferencesForm from "./ReferencesForm";
import SkillsForm from "./SkillsForm";
import SummaryForm from "./SummaryForm";
import VolunteerForm from "./VolunteerForm";
import WorkForm from "./WorkForm";

const SECTION_COMPONENTS: Record<SectionId, Component> = {
  basics: BasicsForm,
  summary: SummaryForm,
  work: WorkForm,
  education: EducationForm,
  skills: SkillsForm,
  languages: LanguagesForm,
  interests: InterestsForm,
  references: ReferencesForm,
  projects: ProjectsForm,
  certs: CertificatesForm,
  volunteer: VolunteerForm,
  awards: AwardsForm,
  publications: PublicationsForm,
};

/** What the open tab means: which version, and how editing behaves in it. */
function ModeNote() {
  return (
    <Show
      when={activeVersion()}
      fallback={
        <Show
          when={versions.length === 0}
          fallback={
            <p class="text-body-sm text-fg-muted">
              Master holds everything. Changes here reach every version that hasn't reworded them.
            </p>
          }
        >
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p class="min-w-0 flex-1 basis-64 text-body-sm text-fg-muted">
              Master holds everything. Make a version for each job, then untick what it doesn't
              need.
            </p>
            <button type="button" class={outlineButton} onClick={() => setVersionDialog("create")}>
              <Plus />
              New version
            </button>
          </div>
        </Show>
      }
    >
      {(version) => {
        const count = () => countKept(resume, version());
        // The name is often made from the job already, so don't repeat it.
        const job = () =>
          [version().jobTitle, version().company]
            .filter((part) => part && !version().name.includes(part))
            .join(" · ");
        return (
          <div>
            <div class="flex flex-wrap items-baseline justify-between gap-x-4">
              <p class="text-ui-sm">
                {version().name}
                <Show when={job()}>
                  <span class="text-fg-muted"> · {job()}</span>
                </Show>
              </p>
              <p class="font-mono text-ui-xs text-keep">
                {count().kept} of {count().total} kept
              </p>
            </div>
            <p class="mt-1 text-body-sm text-fg-muted">
              Untick what this job doesn't need. Text you change here is reworded for this version
              only.
            </p>
          </div>
        );
      }}
    </Show>
  );
}

/** The form for the open section, with a note on what the open tab is. */
export default function EditorShell() {
  const section = () => getSectionDefinition(activeSection());
  const next = () => {
    const index = SECTION_DEFINITIONS.findIndex((s) => s.id === activeSection());
    return SECTION_DEFINITIONS[index + 1];
  };

  const goTo = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById("section-heading")?.focus();
  };

  return (
    <div class="@container mx-auto w-full max-w-2xl px-4 pt-4 pb-10 md:px-6 md:pt-6">
      <div class="mb-6 rounded-2xl bg-surface p-4 ring-1 ring-line">
        <ModeNote />
        <div class="mt-3 border-t border-line pt-3">
          <PageFit />
        </div>
      </div>
      <h2
        id="section-heading"
        tabIndex={-1}
        class="mb-4 text-heading-6 text-balance outline-offset-4"
      >
        {section()?.label}
      </h2>
      <Dynamic component={SECTION_COMPONENTS[activeSection()]} />
      <Show when={next()}>
        {(following) => (
          <div class="mt-8 flex justify-end border-t border-line pt-4">
            <button
              type="button"
              class="btn-quiet h-11 gap-1.5 px-3 text-ui-sm md:h-9"
              onClick={() => goTo(following().id)}
            >
              Next: {following().label}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}
