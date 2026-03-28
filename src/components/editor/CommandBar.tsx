import { type Component, createSignal, For, Show } from "solid-js";

import { exportPDF } from "@/lib/export/pdf-export";
import { validateUploadFile } from "@/lib/upload/guardrails";
import { processUploadedFile } from "@/lib/upload/process-file";
import {
  activeSection,
  loadResume,
  resume,
  selectedTemplate,
  setActiveSection,
  setImportFeedback,
} from "@/store/resume";
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
  const [exportError, setExportError] = createSignal("");
  const [importError, setImportError] = createSignal("");
  const [isImporting, setIsImporting] = createSignal(false);
  let fileInputRef: HTMLInputElement | undefined;

  const completedCount = () => SECTIONS.filter((s) => s.isDone()).length;

  const ringDash = () => {
    const filled = (completedCount() / TOTAL) * CIRCUMFERENCE;
    return `${filled} ${CIRCUMFERENCE - filled}`;
  };

  const handleExport = async () => {
    try {
      setExportError("");
      await exportPDF(JSON.parse(JSON.stringify(resume)), selectedTemplate());
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export this resume yet.");
    }
  };

  const handleImportFile = async (file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setImportError(validation.error);
      setTimeout(() => setImportError(""), 5000);
      return;
    }

    setIsImporting(true);
    setImportError("");

    const outcome = await processUploadedFile(file, validation.extension);
    setIsImporting(false);

    if (!outcome.success) {
      setImportError(outcome.error);
      setTimeout(() => setImportError(""), 5000);
      return;
    }

    const { result } = outcome;
    setImportFeedback({
      confidence: result.confidence,
      work: result.data.work?.length ?? 0,
      education: result.data.education?.length ?? 0,
      skills: result.data.skills?.length ?? 0,
      projects: result.data.projects?.length ?? 0,
      certificates: result.data.certificates?.length ?? 0,
    });
    loadResume(result.data);
  };

  const handleImportInput = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleImportFile(file);
    // Reset so the same file can be re-imported
    input.value = "";
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
      <div
        class="flex shrink-0 items-center gap-1.5"
        aria-label={`${completedCount()} of ${TOTAL} sections complete`}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            stroke-width="3"
          />
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
              class="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
              style={{
                background: activeSection() === section.id ? "#1d6648" : "rgba(255,255,255,0.08)",
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

      {/* Import + Draft manager + export */}
      <div class="flex shrink-0 flex-col items-end gap-1.5">
        <Show when={exportError() || importError()}>
          <p class="max-w-56 text-right text-[11px] leading-snug text-red-200" role="alert">
            {exportError() || importError()}
          </p>
        </Show>
        <div class="flex items-center gap-2">
          {/* Hidden file input for import */}
          <input
            ref={(el) => (fileInputRef = el)}
            type="file"
            accept=".pdf,.docx"
            class="sr-only"
            aria-label="Import resume file"
            onInput={handleImportInput}
          />
          <button
            type="button"
            onClick={() => fileInputRef?.click()}
            disabled={isImporting()}
            title="Import a PDF or DOCX resume"
            aria-label="Import resume from file"
            class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <Show
              when={!isImporting()}
              fallback={
                <svg
                  class="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </Show>
            <span class="hidden sm:inline">{isImporting() ? "Importing…" : "Import"}</span>
          </button>

          <DraftManager dark />
          <button
            type="button"
            onClick={handleExport}
            class="rounded-md px-3 py-1.5 text-xs font-medium text-white transition-all active:scale-95"
            style={{ background: "#1d6648", border: "1px solid #2d9469" }}
          >
            Export PDF
          </button>
        </div>
      </div>
    </header>
  );
};

export default CommandBar;
