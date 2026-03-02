import { type Component, For } from "solid-js";
import { resume, selectedTemplate, activeSection, setActiveSection } from "@/store/resume";
import { exportPDF } from "@/lib/export/pdf-export";
import type { SectionId } from "@/types/resume";
import DraftManager from "./DraftManager";

interface Section {
  id: SectionId;
  label: string;
  isDone: () => boolean;
}

const SECTIONS: Section[] = [
  { id: "basics", label: "Basics", isDone: () => !!resume.basics.name },
  { id: "summary", label: "Summary", isDone: () => !!resume.basics.summary },
  { id: "work", label: "Work", isDone: () => (resume.work?.length ?? 0) > 0 },
  { id: "education", label: "Education", isDone: () => (resume.education?.length ?? 0) > 0 },
  { id: "skills", label: "Skills", isDone: () => (resume.skills?.length ?? 0) > 0 },
  { id: "projects", label: "Projects", isDone: () => (resume.projects?.length ?? 0) > 0 },
  { id: "certs", label: "Certs", isDone: () => (resume.certificates?.length ?? 0) > 0 },
];

const TOTAL = SECTIONS.length;
const CIRCUMFERENCE = 2 * Math.PI * 14;

const CommandBar: Component = () => {
  const completedCount = () => SECTIONS.filter((s) => s.isDone()).length;

  const ringDash = () => {
    const filled = (completedCount() / TOTAL) * CIRCUMFERENCE;
    return `${filled} ${CIRCUMFERENCE - filled}`;
  };

  const handleExport = async () => {
    await exportPDF(JSON.parse(JSON.stringify(resume)), selectedTemplate());
  };

  return (
    <header
      class="flex shrink-0 items-center gap-4 px-4 py-2.5"
      style={{ background: "#0e2418" }}
      role="banner"
    >
      {/* Wordmark */}
      <a
        href="/"
        class="mr-2 shrink-0 text-lg font-bold tracking-tight text-white"
        style={{ "font-family": "'Lora', serif" }}
        aria-label="Tailory home"
      >
        Tailory
      </a>

      {/* Completion ring */}
      <div class="flex shrink-0 items-center gap-1.5" aria-label={`${completedCount()} of ${TOTAL} sections complete`}>
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="#4ade80"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray={ringDash()}
            stroke-dashoffset={CIRCUMFERENCE / 4}
            transform="rotate(-90 16 16)"
          />
          <text
            x="16"
            y="16"
            text-anchor="middle"
            dominant-baseline="central"
            fill="white"
            font-size="9"
            font-family="'DM Sans', sans-serif"
            font-weight="600"
          >
            {completedCount()}/{TOTAL}
          </text>
        </svg>
      </div>

      {/* Section chips */}
      <nav class="flex flex-1 items-center gap-1.5 overflow-x-auto" aria-label="Resume sections">
        <For each={SECTIONS}>
          {(section) => (
            <button
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={activeSection() === section.id}
              class="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background:
                  activeSection() === section.id
                    ? "#1d6648"
                    : "rgba(255,255,255,0.08)",
                color: activeSection() === section.id ? "#ffffff" : "rgba(255,255,255,0.7)",
                border:
                  activeSection() === section.id
                    ? "1px solid #2d9469"
                    : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <span aria-hidden="true">{section.isDone() ? "✓" : "○"}</span>
              {section.label}
            </button>
          )}
        </For>
      </nav>

      {/* Draft manager + export */}
      <div class="flex shrink-0 items-center gap-2">
        <DraftManager dark />
        <button
          type="button"
          onClick={handleExport}
          class="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
          style={{ background: "#1d6648", border: "1px solid #2d9469" }}
        >
          Export PDF
        </button>
      </div>
    </header>
  );
};

export default CommandBar;
