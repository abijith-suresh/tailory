import { createSignal, createEffect, For, Show, type Component } from "solid-js";
import { resume, loadResume } from "@/store/resume";
import { saveDraft, listDrafts, deleteDraft, type ResumeDraft } from "@/lib/storage/db";

type Status = "idle" | "saving" | "saved";

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const DraftManager: Component = () => {
  const [status, setStatus] = createSignal<Status>("idle");
  const [drafts, setDrafts] = createSignal<ResumeDraft[]>([]);
  const [showList, setShowList] = createSignal(false);

  // Auto-save on store changes (debounced 2s)
  createEffect(() => {
    // Reactive read of the resume store fields that trigger saves
    const snapshot = JSON.stringify(resume);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      await performSave(snapshot);
    }, 2000);
  });

  const performSave = async (snapshotJson?: string) => {
    setStatus("saving");
    const data = snapshotJson ? JSON.parse(snapshotJson) : JSON.parse(JSON.stringify(resume));
    await saveDraft({
      id: "autosave",
      name: data.basics?.name || "Untitled",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumeData: data,
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const saveNamedDraft = async () => {
    setStatus("saving");
    const draftName = resume.basics.name || "Untitled";
    await saveDraft({
      id: `draft-${Date.now()}`,
      name: draftName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resumeData: JSON.parse(JSON.stringify(resume)),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const loadDraftsList = async () => {
    const all = await listDrafts();
    setDrafts(all.filter((d) => d.id !== "autosave"));
    setShowList(true);
  };

  const loadDraft = (draft: ResumeDraft) => {
    loadResume(draft.resumeData);
    setShowList(false);
  };

  const removeDraft = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteDraft(id);
    const all = await listDrafts();
    setDrafts(all.filter((d) => d.id !== "autosave"));
  };

  return (
    <div class="relative">
      <div class="flex gap-2">
        <button
          type="button"
          onClick={saveNamedDraft}
          disabled={status() === "saving"}
          class="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          {status() === "saving" ? "Saving…" : status() === "saved" ? "Saved ✓" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={loadDraftsList}
          class="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
        >
          Drafts
        </button>
      </div>

      <Show when={showList()}>
        <div class="absolute right-0 top-8 z-20 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
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
              fallback={
                <p class="px-4 py-6 text-center text-xs text-gray-400">No saved drafts</p>
              }
            >
              <For each={drafts()}>
                {(draft) => (
                  <div class="flex w-full items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => loadDraft(draft)}
                      class="flex-1 text-left"
                    >
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
