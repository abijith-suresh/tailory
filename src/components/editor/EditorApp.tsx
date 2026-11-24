import { createEffect, For, on } from "solid-js";

import ResumePreview from "@/components/preview/ResumePreview";
import { Announcer } from "@/components/ui/announcer";
import { ConfirmHost } from "@/components/ui/confirm";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { activeVersion, type EditorView, editorView, setEditorView } from "@/store/editor";
import { activeSection } from "@/store/resume";
import { createAutosave } from "./autosave";
import EditorShell from "./EditorShell";
import EditorToasts from "./EditorToasts";
import SectionRail from "./SectionRail";
import TopBar from "./TopBar";
import { tabId, WORKSPACE_ID } from "./VersionTabs";

const VIEWS: { id: EditorView; label: string }[] = [
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
];

/**
 * Phones show the form or the preview, switched from a bar at the bottom. Arrow keys move between
 * the two tabs.
 */
function ViewSwitch() {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = editorView() === "edit" ? "preview" : "edit";
    setEditorView(next);
    document.getElementById(`view-tab-${next}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="View"
      class="flex shrink-0 gap-1 border-t border-line bg-canvas p-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))] md:hidden"
      onKeyDown={onKeyDown}
    >
      <For each={VIEWS}>
        {(view) => (
          <button
            type="button"
            role="tab"
            id={`view-tab-${view.id}`}
            aria-selected={editorView() === view.id}
            aria-controls={`${view.id}-pane`}
            tabIndex={editorView() === view.id ? 0 : -1}
            onClick={() => setEditorView(view.id)}
            class="h-11 flex-1 rounded-button text-ui-sm text-fg-muted aria-selected:bg-surface aria-selected:text-fg aria-selected:ring-1 aria-selected:ring-line-strong"
          >
            {view.label}
          </button>
        )}
      </For>
    </div>
  );
}

/** The whole editor: top bar, then sections, form and preview. */
export default function EditorApp() {
  const autosave = createAutosave();
  const hiddenOnPhone = (view: EditorView) => (editorView() === view ? "" : "max-md:hidden");
  let formScroller!: HTMLDivElement;

  // A new section starts at its top, not wherever the last one was scrolled to.
  createEffect(on(activeSection, () => formScroller.scrollTo?.({ top: 0 }), { defer: true }));

  return (
    <div class="relative flex h-dvh flex-col overflow-clip bg-canvas text-fg">
      <h1 class="sr-only">Resume editor</h1>
      <a
        href="#section-heading"
        class="sr-only z-50 rounded-button bg-fg px-4 py-2 text-ui-sm text-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to the form
      </a>
      <TopBar autosave={autosave} />
      <div
        id={WORKSPACE_ID}
        role="tabpanel"
        aria-labelledby={tabId(activeVersion()?.id ?? null)}
        class="flex min-h-0 flex-1"
      >
        <div
          id="edit-pane"
          role="region"
          aria-label="Edit"
          class={`flex min-h-0 min-w-0 flex-1 flex-col border-line bg-canvas md:max-w-[min(56rem,55%)] md:border-r xl:flex-row ${hiddenOnPhone("edit")}`}
        >
          <SectionRail />
          <div
            ref={formScroller}
            class="min-h-0 flex-1 overflow-y-auto border-line max-xl:border-t xl:border-l"
          >
            <ErrorBoundary>
              <EditorShell />
            </ErrorBoundary>
          </div>
        </div>
        <div
          id="preview-pane"
          role="region"
          aria-label="Preview"
          class={`min-h-0 min-w-0 flex-1 ${hiddenOnPhone("preview")}`}
        >
          <ErrorBoundary>
            <ResumePreview />
          </ErrorBoundary>
        </div>
      </div>
      <ViewSwitch />
      <EditorToasts />
      <Announcer />
      <ConfirmHost />
    </div>
  );
}
