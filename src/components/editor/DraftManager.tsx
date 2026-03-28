import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { loadResume, resume } from "@/store/resume";
import {
  AUTOSAVE_DRAFT_ID,
  deleteDraft,
  listDrafts,
  type ResumeDraft,
  saveDraft,
} from "@/lib/storage/db";
import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { cloneResumeData, restoreAutosaveDraft, saveAutosaveDraft } from "@/lib/storage/drafts";

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
  let saveStatusTimer: ReturnType<typeof setTimeout> | null = null;

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

  onCleanup(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (saveStatusTimer) clearTimeout(saveStatusTimer);
  });

  const btnClass = () =>
    props.dark
      ? "rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50"
      : "rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50";

  return (
    <div class="relative">
      <div class="flex gap-2">
        <button
          type="button"
          onClick={saveNamedDraft}
          disabled={status() === "saving" || !storageAvailable()}
          class={btnClass()}
        >
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
          onClick={loadDraftsList}
          disabled={!storageAvailable()}
          class={btnClass()}
        >
          Drafts
        </button>
      </div>

      <Show when={showList()}>
        <div class="draft-popup-enter absolute right-0 top-8 z-20 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div class="flex items-center justify-between border-b border-gray-100 px-4 py-2">
            <span class="text-xs font-semibold text-gray-700">Saved Drafts</span>
            <button
              type="button"
              onClick={() => setShowList(false)}
              class="text-gray-400 hover:text-gray-600"
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
                  <div class="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50">
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
                      class="ml-2 text-red-400 hover:text-red-600"
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
