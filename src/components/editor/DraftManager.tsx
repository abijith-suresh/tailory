import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import {
  AUTOSAVE_DRAFT_ID,
  deleteDraft,
  listDrafts,
  type ResumeDraft,
  saveDraft,
} from "@/lib/storage/db";
import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { cloneResumeData, restoreAutosaveDraft, saveAutosaveDraft } from "@/lib/storage/drafts";
import { loadResume, resume } from "@/store/resume";

type Status = "idle" | "saving" | "saved" | "error";

interface DraftManagerProps {
  dark?: boolean;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const DraftManager: Component<DraftManagerProps> = (props) => {
  const [status, setStatus] = createSignal<Status>("idle");
  const [drafts, setDrafts] = createSignal<ResumeDraft[]>([]);
  const [showList, setShowList] = createSignal(false);
  const [storageAvailable, setStorageAvailable] = createSignal(true);
  const [hasHydratedAutosave, setHasHydratedAutosave] = createSignal(false);
  const [lastAutosaveSnapshot, setLastAutosaveSnapshot] = createSignal<string>();
  const [popupTop, setPopupTop] = createSignal(0);
  const [popupRight, setPopupRight] = createSignal(0);
  let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

  const computePopupPosition = () => {
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    setPopupTop(rect.bottom + 4);
    setPopupRight(window.innerWidth - rect.right);
  };

  const queueStatusReset = () => {
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => setStatus("idle"), 2000);
  };

  onMount(async () => {
    const restored = await restoreAutosaveDraft();
    setStorageAvailable(restored.available);

    if (!restored.available) {
      setStatus("error");
      return;
    }

    if (restored.draft) {
      setLastAutosaveSnapshot(restored.snapshotJson);
      loadResume(restored.draft.resumeData);
    }

    setHasHydratedAutosave(true);
  });

  // Auto-save on store changes (debounced 2s)
  createEffect(() => {
    if (!hasHydratedAutosave() || !storageAvailable()) return;

    // Reactive read of the resume store fields that trigger saves
    const snapshot = serializeNormalizedResume(resume);
    if (snapshot === lastAutosaveSnapshot()) return;

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await performSave(snapshot);
    }, 2000);
  });

  const performSave = async (snapshotJson?: string) => {
    setStatus("saving");
    const snapshot = snapshotJson ?? serializeNormalizedResume(resume);
    const saved = await saveAutosaveDraft(snapshot);

    if (!saved) {
      setStorageAvailable(false);
      setStatus("error");
      return;
    }

    setLastAutosaveSnapshot(snapshot);
    setStatus("saved");
    queueStatusReset();
  };

  const saveNamedDraft = async () => {
    if (!storageAvailable()) {
      setStatus("error");
      return;
    }

    setStatus("saving");
    const draftName = resume.basics.name || "Untitled";
    const saved = await saveDraft({
      id: `draft-${Date.now()}`,
      name: draftName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumeData: cloneResumeData(resume),
    });

    if (!saved) {
      setStorageAvailable(false);
      setStatus("error");
      return;
    }

    setStatus("saved");
    queueStatusReset();
  };

  const loadDraftsList = async () => {
    computePopupPosition();
    const all = await listDrafts();
    setDrafts(all.filter((d) => d.id !== AUTOSAVE_DRAFT_ID));
    setShowList(true);
  };

  const loadDraft = (draft: ResumeDraft) => {
    loadResume(draft.resumeData);
    setShowList(false);
  };

  const removeDraft = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const deleted = await deleteDraft(id);
    if (!deleted) {
      setStorageAvailable(false);
      setStatus("error");
      return;
    }

    const all = await listDrafts();
    setDrafts(all.filter((d) => d.id !== AUTOSAVE_DRAFT_ID));
  };

  // Click-outside: close the drafts popup when user clicks elsewhere
  let containerRef: HTMLDivElement | undefined;
  createEffect(() => {
    if (!showList()) return;
    const handler = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  onCleanup(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
  });

  const btnClass = () =>
    props.dark
      ? "rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
      : "rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div class="relative" ref={(el) => (containerRef = el)}>
      {/* Mobile compact button — only in dark (CommandBar) mode */}
      <Show when={props.dark}>
        <button
          type="button"
          onClick={
            showList()
              ? () => setShowList(false)
              : () => {
                  computePopupPosition();
                  loadDraftsList();
                }
          }
          disabled={!storageAvailable()}
          title="Drafts"
          aria-label="Open saved drafts"
          class="flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 sm:hidden"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      </Show>
      <div class="hidden gap-2 sm:flex">
        <button
          type="button"
          onClick={saveNamedDraft}
          disabled={status() === "saving" || !storageAvailable()}
          class={`flex items-center gap-1.5 ${btnClass()}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {status() === "saving"
            ? "Saving..."
            : status() === "saved"
              ? "Saved"
              : status() === "error"
                ? "Drafts unavailable"
                : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => (showList() ? setShowList(false) : loadDraftsList())}
          disabled={!storageAvailable()}
          class={`flex items-center gap-1.5 ${btnClass()}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Drafts
        </button>
      </div>

      <Show when={showList()}>
        <div
          class="draft-popup-enter z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{
            position: "fixed",
            top: `${popupTop()}px`,
            right: `${popupRight()}px`,
          }}
        >
          <div class="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span class="text-xs font-semibold text-gray-700">Saved Drafts</span>
            <button
              type="button"
              onClick={() => setShowList(false)}
              class="rounded-md text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <Show
              when={drafts().length > 0}
              fallback={<p class="px-4 py-6 text-center text-xs text-gray-400">No saved drafts</p>}
            >
              <For each={drafts()}>
                {(draft) => (
                  <div class="flex w-full cursor-pointer items-center justify-between rounded-md px-4 py-2.5 transition-colors hover:bg-gray-50">
                    <button type="button" onClick={() => loadDraft(draft)} class="flex-1 text-left">
                      <p class="text-xs font-medium text-gray-800">{draft.name}</p>
                      <p class="text-xs text-gray-400">
                        {new Date(draft.updatedAt).toLocaleString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeDraft(e, draft.id)}
                      aria-label="Delete draft"
                      class="ml-2 rounded-md text-red-400 transition-colors hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default DraftManager;
