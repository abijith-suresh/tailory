import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { createSerializedTaskQueue } from "@/lib/storage/autosave-queue";
import { AUTOSAVE_DRAFT_ID, deleteDraft, listDrafts, type ResumeDraft } from "@/lib/storage/db";
import { restoreAutosaveDraft, saveAutosaveDraft, saveNamedDraft } from "@/lib/storage/drafts";
import { loadResume, resume, setDraftStorageError } from "@/store/resume";
import { replaceResume } from "./replace-resume";

type Status = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY = 2000;
const SAVE_FAILED_MESSAGE =
  "Couldn't save your changes in this browser. Export JSON to keep a copy.";
const STORAGE_UNAVAILABLE_MESSAGE =
  "Drafts aren't available in this browser, so changes won't be saved. Export JSON to keep a copy.";

interface DraftManagerProps {
  dark?: boolean;
}

const DraftManager: Component<DraftManagerProps> = (props) => {
  const [status, setStatus] = createSignal<Status>("idle");
  const [drafts, setDrafts] = createSignal<ResumeDraft[]>([]);
  const [listError, setListError] = createSignal("");
  const [showList, setShowList] = createSignal(false);
  const [storageAvailable, setStorageAvailable] = createSignal(true);
  const [hasHydratedAutosave, setHasHydratedAutosave] = createSignal(false);
  const [lastAutosaveSnapshot, setLastAutosaveSnapshot] = createSignal<string>();
  const [popupTop, setPopupTop] = createSignal(0);
  const [popupRight, setPopupRight] = createSignal(0);
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnapshot: string | null = null;
  let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;
  let listTrigger: HTMLElement | null = null;
  let isDisposed = false;

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

  // A failed write keeps autosave on: the next change retries, and the message stays until a save
  // succeeds.
  const reportSaveFailure = () => {
    if (isDisposed) return;
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    setStatus("error");
    setDraftStorageError(SAVE_FAILED_MESSAGE);
  };

  const reportSaveSuccess = () => {
    setStatus("saved");
    setDraftStorageError("");
    queueStatusReset();
  };

  const performSave = async (snapshot: string) => {
    if (!isDisposed) setStatus("saving");

    let saved = false;
    try {
      saved = await saveAutosaveDraft(snapshot);
    } catch {
      saved = false;
    }

    if (!saved) {
      reportSaveFailure();
      return;
    }

    if (isDisposed) return;
    setLastAutosaveSnapshot(snapshot);
    reportSaveSuccess();
  };

  const autosaveQueue = createSerializedTaskQueue(performSave);

  const flushAutosave = () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    const snapshot = pendingSnapshot;
    pendingSnapshot = null;
    if (snapshot === null) return;
    void autosaveQueue.enqueue(snapshot).catch(reportSaveFailure);
  };

  // Save pending edits right away when the tab is hidden or closed instead of dropping them.
  const flushWhenHidden = () => {
    if (document.visibilityState === "hidden") flushAutosave();
  };
  window.addEventListener("pagehide", flushAutosave);
  document.addEventListener("visibilitychange", flushWhenHidden);

  onMount(async () => {
    const restored = await restoreAutosaveDraft();
    if (isDisposed) return;
    setStorageAvailable(restored.available);

    if (!restored.available) {
      setStatus("error");
      setDraftStorageError(STORAGE_UNAVAILABLE_MESSAGE);
      return;
    }

    if (restored.draft) {
      setLastAutosaveSnapshot(restored.snapshotJson);
      loadResume(restored.draft.resumeData);
    }

    setHasHydratedAutosave(true);
  });

  // Auto-save on store changes (debounced)
  createEffect(() => {
    if (!hasHydratedAutosave() || !storageAvailable()) return;

    // Reactive read of the resume store fields that trigger saves
    const snapshot = serializeNormalizedResume(resume);

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    pendingSnapshot = null;
    if (snapshot === lastAutosaveSnapshot()) return;

    pendingSnapshot = snapshot;
    autoSaveTimer = setTimeout(flushAutosave, AUTOSAVE_DELAY);
  });

  const handleSaveDraft = async () => {
    setStatus("saving");
    const saved = await saveNamedDraft(resume);
    if (isDisposed) return;

    if (!saved) {
      reportSaveFailure();
      return;
    }

    reportSaveSuccess();
  };

  const refreshDrafts = async () => {
    const all = await listDrafts();
    if (all === null) {
      setDrafts([]);
      setListError("Couldn't load your drafts. Try again.");
      return;
    }

    setListError("");
    setDrafts(all.filter((d) => d.id !== AUTOSAVE_DRAFT_ID));
  };

  const openList = async (trigger: HTMLElement) => {
    listTrigger = trigger;
    computePopupPosition();
    await refreshDrafts();
    setShowList(true);
  };

  const closeList = (restoreFocus = true) => {
    setShowList(false);
    if (restoreFocus) listTrigger?.focus();
  };

  const toggleList = (e: MouseEvent & { currentTarget: HTMLElement }) => {
    if (showList()) closeList();
    else void openList(e.currentTarget);
  };

  const loadDraft = async (draft: ResumeDraft) => {
    if (await replaceResume(draft.resumeData, "draft")) closeList();
  };

  const removeDraft = async (e: MouseEvent, draft: ResumeDraft) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${draft.name}"? This can't be undone.`)) return;

    if (!(await deleteDraft(draft.id))) {
      setListError("Couldn't delete the draft. Try again.");
      return;
    }

    await refreshDrafts();
  };

  // Close the drafts popup on Escape or when the user clicks elsewhere
  let containerRef: HTMLDivElement | undefined;
  createEffect(() => {
    if (!showList()) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        closeList(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeList();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  onCleanup(() => {
    isDisposed = true;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
    window.removeEventListener("pagehide", flushAutosave);
    document.removeEventListener("visibilitychange", flushWhenHidden);
  });

  const btnClass = () =>
    props.dark
      ? "rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
      : "rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div class="relative" ref={(el) => (containerRef = el)}>
      <span class="sr-only" role="status">
        {status() === "saved" ? "Changes saved" : status() === "error" ? "Changes not saved" : ""}
      </span>
      {/* Mobile compact button — only in dark (CommandBar) mode */}
      <Show when={props.dark}>
        <button
          type="button"
          onClick={toggleList}
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
          onClick={handleSaveDraft}
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
                ? storageAvailable()
                  ? "Not saved"
                  : "Drafts unavailable"
                : "Save draft"}
        </button>
        <button
          type="button"
          onClick={toggleList}
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
              onClick={() => closeList()}
              class="rounded-md text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <Show when={listError()}>
              <p role="alert" class="px-4 py-3 text-xs text-red-600">
                {listError()}
              </p>
            </Show>
            <Show
              when={drafts().length > 0}
              fallback={
                <Show when={!listError()}>
                  <p class="px-4 py-6 text-center text-xs text-gray-400">No saved drafts</p>
                </Show>
              }
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
                      onClick={(e) => removeDraft(e, draft)}
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
