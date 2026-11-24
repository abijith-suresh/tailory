import { type Accessor, createEffect, createSignal, onCleanup, onMount } from "solid-js";

import { createSerializedTaskQueue } from "@/lib/storage/autosave-queue";
import {
  requestPersistentStorage,
  restoreAutosaveDraft,
  saveAutosaveDraft,
} from "@/lib/storage/drafts";
import { joinEditorTabs } from "@/lib/storage/editor-tabs";
import { createDocument, serializeDocument } from "@/lib/versions/document";
import { currentDocument, loadDocument } from "@/store/document";
import { setDraftStorageError, setOtherTabActive } from "@/store/resume";
import { EMPTY_RESUME } from "@/types/resume";

/**
 * - loading: reading the saved resume
 * - saved: everything is in this browser
 * - saving: a change is waiting or being written
 * - failed: the last write failed; the next change retries
 * - off: autosave can't run here (no storage, or the saved resume couldn't be read)
 * - elsewhere: another tab is saving instead
 */
export type AutosaveStatus = "loading" | "saved" | "saving" | "failed" | "off" | "elsewhere";

export const AUTOSAVE_DELAY = 2000;
export const SAVE_FAILED_MESSAGE =
  "Couldn't save your changes in this browser. Export a backup to keep a copy.";
export const STORAGE_UNAVAILABLE_MESSAGE =
  "This browser can't save your resume, so changes will be lost when you leave. Export a backup to keep a copy.";
export const READ_FAILED_MESSAGE =
  "Couldn't load your saved resume, so changes here won't be saved. Reload the page to try again.";
const EMPTY_SNAPSHOT = serializeDocument(createDocument(EMPTY_RESUME));

export interface Autosave {
  status: Accessor<AutosaveStatus>;
  /** False when this browser can't store drafts at all. */
  storageAvailable: Accessor<boolean>;
}

/**
 * Saves the resume and its versions to this browser two seconds after each change, and loads them
 * on start. Fails safe: when the saved resume can't be read, nothing is written over it. Only the
 * most recently opened editor tab saves; older tabs wait until the user takes over.
 */
export function createAutosave(): Autosave {
  const [status, setStatus] = createSignal<AutosaveStatus>("loading");
  const [storageAvailable, setStorageAvailable] = createSignal(true);
  const [isActiveTab, setIsActiveTab] = createSignal(true);
  const [hydrated, setHydrated] = createSignal(false);
  const [lastSnapshot, setLastSnapshot] = createSignal<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingSnapshot: string | null = null;
  let isDisposed = false;

  // A failed write keeps autosave on: the next change retries, and the message stays until a save
  // succeeds.
  const reportFailure = () => {
    if (isDisposed) return;
    setStatus("failed");
    setDraftStorageError(SAVE_FAILED_MESSAGE);
  };

  const performSave = async (snapshot: string) => {
    let saved = false;
    try {
      saved = await saveAutosaveDraft(snapshot);
    } catch {
      saved = false;
    }
    if (!saved) {
      reportFailure();
      return;
    }
    if (isDisposed) return;
    setLastSnapshot(snapshot);
    if (pendingSnapshot === null && isActiveTab()) setStatus("saved");
    setDraftStorageError("");
    requestPersistentStorage();
  };

  const queue = createSerializedTaskQueue(performSave);

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const snapshot = pendingSnapshot;
    pendingSnapshot = null;
    if (snapshot === null) return;
    void queue.enqueue(snapshot).catch(reportFailure);
  };

  // Save pending edits right away when the tab is hidden or closed instead of dropping them.
  const flushWhenHidden = () => {
    if (document.visibilityState === "hidden") flush();
  };
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", flushWhenHidden);

  // Loads the saved resume and turns autosave on. Autosave stays off when the saved resume can't be
  // read, so an empty editor never overwrites it.
  const restore = async () => {
    const restored = await restoreAutosaveDraft();
    if (isDisposed) return;
    setStorageAvailable(restored.available);

    if (!restored.available || restored.readFailed) {
      setHydrated(false);
      setStatus("off");
      setDraftStorageError(restored.available ? READ_FAILED_MESSAGE : STORAGE_UNAVAILABLE_MESSAGE);
      return;
    }

    setDraftStorageError("");
    if (restored.draft) loadDocument(restored.draft.document);
    // Only save once the resume differs from what is stored, or from the empty resume when
    // nothing is stored yet.
    setLastSnapshot(restored.snapshotJson ?? EMPTY_SNAPSHOT);
    setHydrated(true);
    setStatus("saved");
  };

  const takeOver = async () => {
    tabs.claim();
    setOtherTabActive(null);
    await restore();
    if (!isDisposed) setIsActiveTab(true);
  };

  const tabs = joinEditorTabs(() => {
    if (isDisposed) return;
    flush();
    setIsActiveTab(false);
    setStatus("elsewhere");
    setOtherTabActive({ takeOver: () => void takeOver() });
  });

  onMount(async () => {
    tabs.claim();
    await restore();
  });

  createEffect(() => {
    if (!hydrated() || !storageAvailable() || !isActiveTab()) return;

    // Reading the whole document here makes any change to the master or a version save.
    const snapshot = serializeDocument(currentDocument());

    if (timer) clearTimeout(timer);
    timer = null;
    pendingSnapshot = null;
    if (snapshot === lastSnapshot()) return;

    pendingSnapshot = snapshot;
    if (status() !== "failed") setStatus("saving");
    timer = setTimeout(flush, AUTOSAVE_DELAY);
  });

  onCleanup(() => {
    isDisposed = true;
    if (timer) clearTimeout(timer);
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", flushWhenHidden);
    tabs.close();
    setOtherTabActive(null);
  });

  return { status, storageAvailable };
}

export function autosaveLabel(status: AutosaveStatus): string {
  switch (status) {
    case "loading":
      return "Loading…";
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved in this browser";
    case "failed":
      return "Not saved";
    case "off":
      return "Not saving";
    case "elsewhere":
      return "Saving in another tab";
  }
}
