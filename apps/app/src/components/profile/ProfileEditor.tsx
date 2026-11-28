import type { ResumeSchema } from "@tailory/core";
import { createSignal, createStore, onSettled, Show, snapshot } from "solid-js";

import { type AutosaveStatus, createAutosave } from "../../lib/autosave";
import type { ImportPreview } from "../../lib/import/import-file";
import {
  getProfileState,
  importProfileFile,
  saveProfileEdit,
  undoProfileEdit,
} from "../../server/profile-functions";
import type { ChangeView, ProfileState, SaveResult } from "../../server/profile-page";
import { Button } from "../Button";
import { ImportReview } from "./ImportReview";
import { ProfileChanges } from "./ProfileChanges";
import { type Edit, ProfileForm } from "./ProfileForm";

/** A JSON copy: server function arguments must be plain JSON, and resumes hold undefined fields. */
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** How long typing pauses before the profile saves. */
export const SAVE_DELAY_MS = 800;

const STATUS_TEXT: Record<AutosaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save. Retrying when you edit again.",
  conflict: "Changed somewhere else",
};

const ACCEPT =
  ".pdf,.docx,.json,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * The profile editor. Edits save on their own a moment after you stop typing; each save is one
 * change in the log. Import and Undo replace what the form shows with what the server has.
 */
export function ProfileEditor(props: { initial: ProfileState }) {
  // What the form shows. It follows `loaded`, which changes only when the whole profile is
  // replaced (import, undo, reload); saves don't touch it, so typing is never overwritten.
  const [loaded, setLoaded] = createSignal(() => props.initial);
  const [resume, setResume] = createStore(() => structuredClone(loaded().resume));
  const [changes, setChanges] = createSignal<ChangeView[]>(() => props.initial.changes);
  const [status, setStatus] = createSignal<AutosaveStatus>("saved");
  const [busy, setBusy] = createSignal(false);
  const [preview, setPreview] = createSignal<ImportPreview | null>(null);
  const [reading, setReading] = createSignal(false);
  const [importError, setImportError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  let fileInput: HTMLInputElement | undefined;

  // "Import a resume" on the first-run screen links to /profile?import: open the file picker.
  // Browsers may refuse without a fresh click, so the Import button also gets focus.
  onSettled(() => {
    if (!new URLSearchParams(window.location.search).has("import")) return;
    document.getElementById("import")?.focus();
    fileInput?.click();
  });

  // The profile the server has, as this page last saw it. Saves send it so the server can tell
  // when someone else changed the profile meanwhile.
  let base: ResumeSchema | undefined;
  const currentBase = () => base ?? props.initial.resume;

  const saver = createAutosave({
    delay: SAVE_DELAY_MS,
    onStatus: setStatus,
    save: async () => {
      const result = await saveProfileEdit(plain(currentBase()), plain(snapshot(resume)));
      if (result.ok) {
        base = result.resume;
        setChanges(result.changes);
        return "saved";
      }
      if (result.reason === "invalid") setNotice(result.message);
      return result.reason === "conflict" ? "conflict" : "failed";
    },
  });
  const flush = () => saver.flush();

  const show = (state: ProfileState) => {
    base = state.resume;
    saver.reset();
    setLoaded(() => state);
    setChanges(state.changes);
  };

  const edit: Edit = (change) => {
    setResume((draft) => {
      change(draft);
    });
    setNotice("");
    saver.changed();
  };

  onSettled(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saver.pending()) event.preventDefault();
    };
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", hide);
      saver.dispose();
    };
  });

  /** Runs a whole-profile action after pending edits are saved, then shows what came back. */
  const replaceWith = async (action: () => Promise<SaveResult>, done: string) => {
    setBusy(true);
    try {
      await flush();
      const result = await action();
      if (result.ok) {
        show(result);
        setNotice(done);
        return true;
      }
      setNotice(result.message);
      return false;
    } catch {
      setNotice("Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const undo = (id: string) => void replaceWith(() => undoProfileEdit(id), "Undone.");

  const reload = async () => {
    setBusy(true);
    try {
      show(await getProfileState());
      setNotice("Showing the latest profile.");
    } finally {
      setBusy(false);
    }
  };

  // Keep this page's edits over the other change: save them on top of the latest profile.
  const keepMine = async () => {
    setBusy(true);
    try {
      const latest = await getProfileState();
      base = latest.resume;
      setChanges(latest.changes);
      await saver.retry();
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setNotice("");
    setReading(true);
    try {
      const { readResumeFile } = await import("../../lib/import/import-file");
      const outcome = await readResumeFile(file);
      if (outcome.ok) {
        setPreview(outcome.preview);
        requestAnimationFrame(() => document.getElementById("import-review-title")?.focus());
      } else setImportError(outcome.error);
    } finally {
      setReading(false);
    }
  };

  const confirmImport = async () => {
    const chosen = preview();
    if (!chosen) return;
    const replaced = await replaceWith(
      () => importProfileFile(plain(chosen.resume), chosen.fileName),
      `Replaced your profile with ${chosen.fileName}. Undo it from Recent changes.`
    );
    if (replaced) setPreview(null);
  };

  return (
    <div class="profile">
      <div class="profile__bar">
        <p class={["save-status", `save-status--${status()}`]} role="status">
          {STATUS_TEXT[status()]}
        </p>
        <div class="profile__bar-actions">
          <input
            ref={(element) => {
              fileInput = element;
            }}
            type="file"
            class="visually-hidden"
            tabindex="-1"
            accept={ACCEPT}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void pickFile(file);
            }}
          />
          <Button id="import" disabled={reading() || busy()} onClick={() => fileInput?.click()}>
            {reading() ? "Reading the file…" : "Import a file"}
          </Button>
        </div>
      </div>
      <p class="profile__import-hint">
        Import a PDF, DOCX or JSON Resume file. It is read in your browser; only what you confirm is
        saved.
      </p>

      <p class="form-error" role="alert">
        {importError()}
      </p>
      <Show when={notice()}>
        <p class="notice" role="status">
          {notice()}
        </p>
      </Show>

      <Show when={status() === "conflict"}>
        <section class="panel conflict" aria-labelledby="conflict-title">
          <h2 class="panel__title" id="conflict-title">
            Your profile changed somewhere else
          </h2>
          <p class="panel__text">
            Your agent, or Tailory in another tab, changed it while you were editing here. Load the
            latest profile, which drops your edits since the last save, or keep your version, which
            replaces that change. Either way you can undo it.
          </p>
          <div class="panel__actions">
            <Button variant="primary" disabled={busy()} onClick={() => void reload()}>
              Load the latest
            </Button>
            <Button disabled={busy()} onClick={() => void keepMine()}>
              Keep my version
            </Button>
          </div>
        </section>
      </Show>

      <Show when={preview()}>
        {(chosen) => (
          <ImportReview
            preview={chosen()}
            pending={busy()}
            onConfirm={() => void confirmImport()}
            onCancel={() => setPreview(null)}
          />
        )}
      </Show>

      <div class="profile__layout">
        <div class="profile__main">
          <ProfileForm resume={resume} edit={edit} />
        </div>
        <aside class="profile__aside" aria-labelledby="recent-changes">
          <section class="panel">
            <h2 class="panel__title" id="recent-changes">
              Recent changes
            </h2>
            <ProfileChanges
              changes={changes()}
              busy={busy() || status() === "saving"}
              onUndo={undo}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
