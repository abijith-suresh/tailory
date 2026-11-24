import { createEffect, createSignal, For, Show } from "solid-js";

import { outlineButton, quietButton } from "@/components/ui/buttons";
import { requestConfirm } from "@/components/ui/confirm";
import Dialog, { DialogActions } from "@/components/ui/Dialog";
import { AUTOSAVE_DRAFT_ID, deleteDraft, listDrafts, type ResumeDraft } from "@/lib/storage/db";
import { replaceResume } from "./replace-resume";

interface SavedCopiesDialogProps {
  open: boolean;
  onClose: () => void;
}

const savedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function versionCount(draft: ResumeDraft): string {
  const count = draft.document.versions.length;
  if (count === 0) return "Master only";
  return count === 1 ? "1 version" : `${count} versions`;
}

/** Copies saved in this browser, to open in place of the current resume or delete. */
export default function SavedCopiesDialog(props: SavedCopiesDialogProps) {
  const [copies, setCopies] = createSignal<ResumeDraft[]>([]);
  const [error, setError] = createSignal("");
  const [loaded, setLoaded] = createSignal(false);

  const refresh = async () => {
    const all = await listDrafts();
    setLoaded(true);
    if (all === null) {
      setCopies([]);
      setError("Couldn't load your saved copies. Try again.");
      return;
    }
    setError("");
    setCopies(
      all
        .filter((draft) => draft.id !== AUTOSAVE_DRAFT_ID)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  createEffect(() => {
    if (props.open) void refresh();
    else setLoaded(false);
  });

  const open = async (draft: ResumeDraft) => {
    if (await replaceResume(draft.document, "draft")) props.onClose();
  };

  const remove = async (draft: ResumeDraft) => {
    const confirmed = await requestConfirm({
      title: `Delete “${draft.name}”?`,
      body: "This copy goes for good. Your open resume stays as it is.",
      confirmLabel: "Delete copy",
      danger: true,
    });
    if (!confirmed) return;
    if (!(await deleteDraft(draft.id))) {
      setError("Couldn't delete the copy. Try again.");
      return;
    }
    await refresh();
  };

  return (
    <Dialog
      open={props.open}
      title="Saved copies"
      description="Copies stay in this browser. Clearing site data deletes them."
      onClose={props.onClose}
    >
      <div class="mt-4">
        <Show when={error()}>
          <p role="alert" class="py-2 text-body-sm text-danger">
            {error()}
          </p>
        </Show>
        <Show when={loaded() && copies().length === 0 && !error()}>
          <p class="py-2 text-body-sm text-fg-muted">No saved copies yet.</p>
        </Show>
        <ul class="divide-y divide-line">
          <For each={copies()}>
            {(draft) => (
              <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-ui-sm">{draft.name}</p>
                  <p class="font-mono text-ui-xs text-fg-subtle">
                    {savedAt.format(draft.updatedAt)} · {versionCount(draft)}
                  </p>
                </div>
                <div class="flex gap-1">
                  <button
                    type="button"
                    class={quietButton}
                    aria-label={`Open ${draft.name}`}
                    onClick={() => void open(draft)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    class={`${quietButton} text-danger`}
                    aria-label={`Delete ${draft.name}`}
                    onClick={() => void remove(draft)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </div>
      <DialogActions>
        <button type="button" class={outlineButton} onClick={props.onClose}>
          Close
        </button>
      </DialogActions>
    </Dialog>
  );
}
