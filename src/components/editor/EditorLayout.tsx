import { createSignal, onCleanup, onMount, Show } from "solid-js";

import EditorShell from "@/components/editor/EditorShell";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ResumePreview from "@/components/preview/ResumePreview";

type Pane = "editor" | "preview";

const MOBILE_BREAKPOINT = 768;

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
      {/* Panels row */}
      <div style={{ display: "flex", flex: "1", overflow: "hidden", "min-height": "0" }}>
        {/* Editor panel */}
        <div
          style={{
            display: showEditor() ? "flex" : "none",
            width: isMobile() ? "100%" : "50%",
            "flex-direction": "column",
            "border-right": isMobile() ? "none" : "1px solid #ccddd4",
            overflow: "hidden",
          }}
          role="region"
          aria-label="Resume editor"
        >
          <ErrorBoundary>
            <EditorShell />
          </ErrorBoundary>
        </div>

        {/* Preview panel */}
        <div
          style={{
            display: showPreview() ? "flex" : "none",
            width: isMobile() ? "100%" : "50%",
            "flex-direction": "column",
            overflow: "hidden",
          }}
          role="region"
          aria-label="Resume preview"
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
              class="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
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
              class="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
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
