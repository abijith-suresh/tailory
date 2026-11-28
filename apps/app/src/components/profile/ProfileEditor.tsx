import type { ResumeSchema } from "@tailory/core";
import { createSignal, createStore, onSettled, Show, snapshot } from "solid-js";

import type { ImportPreview } from "../../lib/import/import-file";
import {
  getProfileState,
  importProfileFile,
  saveProfileEdit,
  undoProfileEdit,
} from "../../server/profile-functions";
import type { ChangeView, ProfileState, SaveResult } from "../../server/profile-page";
import { Button } from "../Button";
import { ChangeList } from "../ChangeList";
import { ImportReview } from "./ImportReview";
import { type Edit, ProfileForm } from "./ProfileForm";

/** A JSON copy: server function arguments must be plain JSON, and resumes hold undefined fields. */
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** How long typing pauses before the profile saves. */
export const SAVE_DELAY_MS = 800;

type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

const STATUS_TEXT: Record<SaveStatus, string> = {
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
  const [status, setStatus] = createSignal<SaveStatus>("saved");
  const [busy, setBusy] = createSignal(false);
  const [preview, setPreview] = createSignal<ImportPreview | null>(null);
  const [reading, setReading] = createSignal(false);
  const [importError, setImportError] = createSignal("");
  const [notice, setNotice] = createSignal("");
  let fileInput: HTMLInputElement | undefined;

  // Save bookkeeping lives in plain variables: signal reads lag writes until the next flush.
  let base: ResumeSchema | undefined; // the profile the server has, as this page last saw it
  let dirty = false;
  let conflicted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;

  const currentBase = () => base ?? props.initial.resume;

  const show = (state: ProfileState) => {
    base = state.resume;
    dirty = false;
    conflicted = false;
    setLoaded(() => state);
    setChanges(state.changes);
    setStatus("saved");
  };

  const send = async () => {
    dirty = false;
    setStatus("saving");
    let result: SaveResult;
    try {
      result = await saveProfileEdit(plain(currentBase()), plain(snapshot(resume)));
    } catch {
      dirty = true;
      setStatus("error");
      return;
    }
    if (result.ok) {
      base = result.resume;
      setChanges(result.changes);
      setStatus(dirty ? "unsaved" : "saved");
    } else if (result.reason === "conflict") {
      dirty = true;
      conflicted = true;
      setStatus("conflict");
    } else {
      setStatus("error");
      setNotice(result.message);
    }
  };

  /** Saves now if anything is waiting. Resolves once the profile on the server is up to date. */
  const flush = async () => {
    clearTimeout(timer);
    while (inFlight) await inFlight;
    if (!dirty || conflicted) return;
    inFlight = send().finally(() => {
      inFlight = null;
    });
    await inFlight;
    if (dirty && !conflicted) schedule();
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const edit: Edit = (change) => {
    setResume((draft) => {
      change(draft);
    });
    dirty = true;
    setNotice("");
    if (conflicted) return;
    setStatus("unsaved");
    schedule();
  };

  onSettled(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || inFlight) event.preventDefault();
    };
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", hide);
      clearTimeout(timer);
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
      conflicted = false;
      dirty = true;
      setChanges(latest.changes);
      await flush();
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
          <Button disabled={reading() || busy()} onClick={() => fileInput?.click()}>
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
            <ChangeList changes={changes()} busy={busy() || status() === "saving"} onUndo={undo} />
          </section>
        </aside>
      </div>
    </div>
  );
}
