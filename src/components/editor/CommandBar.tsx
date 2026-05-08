import { type Component, createSignal, For, Show } from "solid-js";

import { exportPDF } from "@/lib/export/pdf-export";
import { exportJsonResumeString } from "@/lib/resume/json";
import { importResumeFile } from "@/lib/upload/import-resume";
import { validateUploadFile } from "@/lib/upload/guardrails";
import {
  activeSection,
  loadResume,
  resume,
  selectedAccentColor,
  selectedPageFormat,
  selectedTemplate,
  setActiveSection,
  setExportError,
  setImportError,
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
  const [isExporting, setIsExporting] = createSignal(false);
  const [isExportingJson, setIsExportingJson] = createSignal(false);
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
      setIsExporting(true);
      await exportPDF(JSON.parse(JSON.stringify(resume)), selectedTemplate(), {
        accentColor: selectedAccentColor(),
        pageFormat: selectedPageFormat(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to export this resume yet.";
      setExportError(msg);
      // Navigate to the relevant section so the user can fix the issue
      if (msg.toLowerCase().includes("name")) {
        setActiveSection("basics");
      } else if (
        msg.toLowerCase().includes("summary") ||
        msg.toLowerCase().includes("experience") ||
        msg.toLowerCase().includes("education") ||
        msg.toLowerCase().includes("skill") ||
        msg.toLowerCase().includes("project") ||
        msg.toLowerCase().includes("certif")
      ) {
        setActiveSection("summary");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setImportError(validation.error);
      return;
    }

    setIsImporting(true);
    setImportError("");

    const outcome = await importResumeFile(file, validation.extension);
    setIsImporting(false);

    if (!outcome.success) {
      setImportError(outcome.error);
      return;
    }

    if (outcome.feedback) {
      setImportFeedback(outcome.feedback);
    }
    loadResume(outcome.resume);
  };

  const handleExportJson = async () => {
    try {
      setExportError("");
      setIsExportingJson(true);
      const contents = exportJsonResumeString(JSON.parse(JSON.stringify(resume)));
      const filename = `${resume.basics.name.trim().replace(/\s+/g, "_") || "resume"}.json`;
      const blob = new Blob([contents], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Unable to export this resume as JSON right now."
      );
    } finally {
      setIsExportingJson(false);
    }
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
      class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0 px-4 py-2.5"
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
        class="hidden shrink-0 items-center gap-1.5 md:flex"
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
      <nav class="hidden md:flex md:flex-1 md:items-center md:gap-1.5" aria-label="Resume sections">
        <div class="flex items-center gap-1.5">
          <For each={SECTIONS}>
            {(section) => (
              <button
                type="button"
                onClick={() => setActiveSection(section.id)}
                aria-pressed={activeSection() === section.id}
                class="flex shrink-0 items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-[background-color,transform] active:scale-95 hover:bg-white/15"
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
        </div>
      </nav>

      {/* Import + Draft manager + export */}
      <div class="ml-auto flex shrink-0 items-center gap-2">
        {/* Hidden file input for import */}
        <input
          ref={(el) => (fileInputRef = el)}
          type="file"
          accept=".pdf,.docx,.json"
          class="sr-only"
          aria-label="Import resume file"
          onInput={handleImportInput}
        />
        <button
          type="button"
          onClick={() => fileInputRef?.click()}
          disabled={isImporting()}
          title="Import a PDF, DOCX, or JSON resume"
          aria-label="Import resume from file"
          class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M12 12v6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
          </Show>
          <span class="hidden sm:inline">{isImporting() ? "Importing…" : "Import"}</span>
        </button>

        <DraftManager dark />
        <button
          type="button"
          onClick={handleExportJson}
          disabled={isExportingJson()}
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white/80 transition-[background-color,transform] active:scale-95 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Show
            when={!isExportingJson()}
            fallback={
              <svg
                class="animate-spin"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </Show>
          <span class="hidden sm:inline">{isExportingJson() ? "Exporting..." : "Export JSON"}</span>
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting()}
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-[background-color,transform] active:scale-95 hover:bg-[#155236] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#1d6648", border: "1px solid #2d9469" }}
        >
          <Show
            when={!isExporting()}
            fallback={
              <svg
                class="animate-spin"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M12 12v6" />
              <path d="m15 18-3 3-3-3" />
            </svg>
          </Show>
          <span class="hidden sm:inline">{isExporting() ? "Exporting…" : "Export PDF"}</span>
        </button>
      </div>
    </header>
  );
};

export default CommandBar;
