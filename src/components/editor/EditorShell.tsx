import { type Component, Show } from "solid-js";
import { Transition } from "solid-transition-group";

import { activeSection, setActiveSection } from "@/store/resume";
import { EDITOR_SECTIONS, getEditorSectionDefinition } from "./section-registry";

// ── EditorShell ──────────────────────────────────────────────────────────────

const EditorShell: Component = () => {
  const currentSection = () => getEditorSectionDefinition(activeSection());
  const currentIndex = () => EDITOR_SECTIONS.findIndex((section) => section.id === activeSection());
  const prevSection = () => (currentIndex() > 0 ? EDITOR_SECTIONS[currentIndex() - 1] : null);
  const nextSection = () =>
    currentIndex() < EDITOR_SECTIONS.length - 1 ? EDITOR_SECTIONS[currentIndex() + 1] : null;

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
              {currentIndex() + 1}/{EDITOR_SECTIONS.length}
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
