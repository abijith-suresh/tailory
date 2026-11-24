import {
  AUTOSAVE_DRAFT_ID,
  getDraft,
  isDraftStorageAvailable,
  listDrafts,
  type ResumeDraft,
  saveDraft,
} from "@/lib/storage/db";
import { createDocument, normalizeDocument, serializeDocument } from "@/lib/versions/document";
import type { ResumeDocument } from "@/types/document";
import { EMPTY_RESUME } from "@/types/resume";

export type ReplaceReason = "import" | "draft";

const COPY_NAME_SUFFIX: Record<ReplaceReason, string> = {
  import: "before import",
  draft: "before loading draft",
};

const EMPTY_SNAPSHOT = serializeDocument(createDocument(EMPTY_RESUME));

function draftName(document: ResumeDocument): string {
  return document.master.basics.name.trim() || "Untitled";
}

export async function restoreAutosaveDraft(): Promise<{
  available: boolean;
  readFailed?: boolean;
  draft?: ResumeDraft;
  snapshotJson?: string;
}> {
  const available = await isDraftStorageAvailable();

  if (!available) {
    return { available: false };
  }

  const draft = await getDraft(AUTOSAVE_DRAFT_ID);

  if (draft === null) {
    return { available: true, readFailed: true };
  }

  if (!draft) {
    return { available: true };
  }

  const document = normalizeDocument(draft.document);
  return {
    available: true,
    draft: { ...draft, document },
    snapshotJson: serializeDocument(document),
  };
}

export async function saveAutosaveDraft(snapshotJson: string): Promise<boolean> {
  let document: ResumeDocument;

  try {
    document = normalizeDocument(JSON.parse(snapshotJson));
  } catch {
    return false;
  }

  const now = Date.now();

  return saveDraft({
    id: AUTOSAVE_DRAFT_ID,
    name: draftName(document),
    createdAt: now,
    updatedAt: now,
    document,
  });
}

let persistRequested = false;

/** Asks the browser once not to clear saved drafts when it runs low on space. */
export function requestPersistentStorage() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Not supported; drafts still work without it.
  }
}

/** Saves a named draft, updating the existing draft with the same name instead of adding another. */
export async function saveNamedDraft(current: ResumeDocument): Promise<boolean> {
  const document = normalizeDocument(current);
  const name = draftName(document);
  const drafts = await listDrafts();
  if (drafts === null) return false;

  const existing = drafts.find((draft) => draft.id !== AUTOSAVE_DRAFT_ID && draft.name === name);
  const now = Date.now();

  return saveDraft({
    id: existing?.id ?? `draft-${now}`,
    name,
    createdAt: now,
    updatedAt: now,
    document,
  });
}

/**
 * Before the current resume is replaced, saves it as a draft unless it is empty, unchanged by the
 * replacement, or already saved as a named draft.
 */
export async function keepCopyBeforeReplacing(
  current: ResumeDocument,
  incoming: ResumeDocument,
  reason: ReplaceReason
): Promise<"not-needed" | "saved" | "failed"> {
  const snapshot = serializeDocument(current);
  if (snapshot === EMPTY_SNAPSHOT || snapshot === serializeDocument(incoming)) {
    return "not-needed";
  }

  const drafts = await listDrafts();
  if (drafts === null) return "failed";

  const alreadySaved = drafts.some(
    (draft) => draft.id !== AUTOSAVE_DRAFT_ID && serializeDocument(draft.document) === snapshot
  );
  if (alreadySaved) return "not-needed";

  const document = normalizeDocument(current);
  const now = Date.now();
  const saved = await saveDraft({
    id: `copy-${now}`,
    name: `${draftName(document)} (${COPY_NAME_SUFFIX[reason]})`,
    createdAt: now,
    updatedAt: now,
    document,
  });

  return saved ? "saved" : "failed";
}
