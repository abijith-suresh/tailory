import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

import EditorShell from "@/components/editor/EditorShell";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ResumePreview from "@/components/preview/ResumePreview";
import { formatImportReviewCounts, getImportConfidenceState } from "@/lib/editor/import-review";
import {
  dismissImportReview,
  exportError,
  importError,
  importReview,
  setExportError,
  setImportError,
} from "@/store/resume";

type Pane = "editor" | "preview";

const MOBILE_BREAKPOINT = 768;

// ── Toast components ──────────────────────────────────────────────────────────

function ExportErrorToast() {
  createEffect(() => {
    const err = exportError();
    if (!err) return;
    const timer = setTimeout(() => setExportError(""), 5000);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <Show when={exportError()}>
      <div
        role="alert"
        aria-live="assertive"
        class="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-xl shadow-black/10"
        style={{ "pointer-events": "auto" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b91c1c"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p class="flex-1 text-sm leading-snug text-red-700">{exportError()}</p>
        <button
          type="button"
          onClick={() => setExportError("")}
          class="shrink-0 text-red-400 transition-colors hover:text-red-600"
          aria-label="Dismiss"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Show>
  );
}

function ImportErrorToast() {
  createEffect(() => {
    const err = importError();
    if (!err) return;
    const timer = setTimeout(() => setImportError(""), 5000);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <Show when={importError()}>
      <div
        role="alert"
        aria-live="assertive"
        class="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 shadow-xl shadow-black/10"
        style={{ "pointer-events": "auto" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b91c1c"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p class="flex-1 text-sm leading-snug text-red-700">{importError()}</p>
        <button
          type="button"
          onClick={() => setImportError("")}
          class="shrink-0 text-red-400 transition-colors hover:text-red-600"
          aria-label="Dismiss"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Show>
  );
}

function ToastContainer() {
  return (
    <div
      style={{
        position: "fixed",
        top: "60px",
        left: "50%",
        transform: "translateX(-50%)",
        "z-index": "9999",
        display: "flex",
        "flex-direction": "column",
        gap: "8px",
        width: "calc(100% - 2rem)",
        "max-width": "28rem",
        "pointer-events": "none",
      }}
    >
      <ExportErrorToast />
      <ImportErrorToast />
    </div>
  );
}

function ImportReviewCard() {
  return (
    <Show when={importReview() && !importReview()!.dismissed}>
      {(_) => {
        const review = importReview()!;
        const confidence = getImportConfidenceState(review.feedback.confidence);

        return (
          <section
            class="border-b px-6 py-4"
            style={{ background: "#ffffff", "border-color": confidence.border }}
          >
            <div class="mx-auto flex max-w-6xl items-start gap-4">
              <div
                class="mt-0.5 h-12 w-1.5 shrink-0 rounded-full"
                style={{ background: confidence.accent }}
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-semibold" style={{ color: confidence.accent }}>
                    {confidence.label}
                  </p>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {review.feedback.confidence}/100
                  </span>
                </div>
                <p class="mt-1 text-sm text-slate-700">
                  {formatImportReviewCounts(review.feedback)} Review each section before exporting.
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  This reflects parser confidence only — it is not an ATS guarantee.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissImportReview}
                class="shrink-0 rounded-md px-2 py-1 text-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss import review card"
              >
                ✕
              </button>
            </div>
          </section>
        );
      }}
    </Show>
  );
}

// ── EditorLayout ──────────────────────────────────────────────────────────────

export default function EditorLayout() {
  const [activePane, setActivePane] = createSignal<Pane>("editor");
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );

  onMount(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", handler);
    onCleanup(() => window.removeEventListener("resize", handler));
  });

  const showEditor = () => !isMobile() || activePane() === "editor";
  const showPreview = () => !isMobile() || activePane() === "preview";

  return (
    <div
      style={{
        display: "flex",
        flex: "1",
        "flex-direction": "column",
        overflow: "hidden",
        "min-height": "0",
      }}
    >
      <ToastContainer />
      <ImportReviewCard />

      {/* Panels row */}
      <div
        style={{
          display: "flex",
          flex: "1",
          overflow: "hidden",
          "min-height": "0",
          position: "relative",
        }}
      >
        {/* Editor panel */}
        <div
          style={{
            display: "flex",
            width: isMobile() ? "100%" : "50%",
            "flex-direction": "column",
            "border-right": isMobile() ? "none" : "1px solid #ccddd4",
            overflow: "hidden",
            opacity: showEditor() ? "1" : "0",
            "pointer-events": showEditor() ? "auto" : "none",
            transform: showEditor() ? "translateX(0)" : "translateX(-12px)",
            transition: "opacity 180ms ease, transform 180ms ease",
            position: isMobile() ? "absolute" : "relative",
            inset: isMobile() ? "0" : "auto",
          }}
          role="region"
          aria-label="Resume editor"
          aria-hidden={!showEditor()}
        >
          <ErrorBoundary>
            <EditorShell />
          </ErrorBoundary>
        </div>

        {/* Preview panel */}
        <div
          style={{
            display: "flex",
            width: isMobile() ? "100%" : "50%",
            "flex-direction": "column",
            overflow: "hidden",
            opacity: showPreview() ? "1" : "0",
            "pointer-events": showPreview() ? "auto" : "none",
            transform: showPreview() ? "translateX(0)" : "translateX(12px)",
            transition: "opacity 180ms ease, transform 180ms ease",
            position: isMobile() ? "absolute" : "relative",
            inset: isMobile() ? "0" : "auto",
          }}
          role="region"
          aria-label="Resume preview"
          aria-hidden={!showPreview()}
        >
          <ErrorBoundary>
            <ResumePreview />
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile tab bar — part of normal flow (not fixed), sits below panels */}
      <Show when={isMobile()}>
        <div
          style={{ background: "#f4f8f5", "flex-shrink": "0" }}
          class="border-t border-[#ccddd4]"
        >
          <div class="flex" role="tablist" aria-label="Switch between editor and preview">
            <button
              role="tab"
              aria-selected={activePane() === "editor"}
              class="flex flex-1 flex-col items-center gap-1 rounded-md py-3 text-xs font-medium transition-colors active:scale-[0.97] hover:bg-[#dceae2]"
              style={{
                color: activePane() === "editor" ? "#1d6648" : "#5a7a68",
                "background-color": activePane() === "editor" ? "#edf4f0" : "transparent",
              }}
              onClick={() => setActivePane("editor")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>

            <button
              role="tab"
              aria-selected={activePane() === "preview"}
              class="flex flex-1 flex-col items-center gap-1 rounded-md py-3 text-xs font-medium transition-colors active:scale-[0.97] hover:bg-[#dceae2]"
              style={{
                color: activePane() === "preview" ? "#1d6648" : "#5a7a68",
                "background-color": activePane() === "preview" ? "#edf4f0" : "transparent",
              }}
              onClick={() => setActivePane("preview")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
