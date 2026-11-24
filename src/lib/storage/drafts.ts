import { normalizeResume, serializeNormalizedResume } from "@/lib/resume/normalize";
import {
  AUTOSAVE_DRAFT_ID,
  getDraft,
  isDraftStorageAvailable,
  listDrafts,
  type ResumeDraft,
  saveDraft,
} from "@/lib/storage/db";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

export type ReplaceReason = "import" | "draft";

const COPY_NAME_SUFFIX: Record<ReplaceReason, string> = {
  import: "before import",
  draft: "before loading draft",
};

export function cloneResumeData(data: ResumeSchema): ResumeSchema {
  return normalizeResume(data);
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

  return {
    available: true,
    draft: {
      ...draft,
      resumeData: cloneResumeData(draft.resumeData),
    },
    snapshotJson: serializeNormalizedResume(draft.resumeData),
  };
}

export async function saveAutosaveDraft(snapshotJson: string): Promise<boolean> {
  let data: ResumeSchema;

  try {
    data = JSON.parse(snapshotJson) as ResumeSchema;
  } catch {
    return false;
  }

  const normalizedData = cloneResumeData(data);
  const now = Date.now();

  return saveDraft({
    id: AUTOSAVE_DRAFT_ID,
    name: normalizedData.basics?.name || "Untitled",
    createdAt: now,
    updatedAt: now,
    resumeData: normalizedData,
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
export async function saveNamedDraft(data: ResumeSchema): Promise<boolean> {
  const name = data.basics.name.trim() || "Untitled";
  const drafts = await listDrafts();
  if (drafts === null) return false;

  const existing = drafts.find((draft) => draft.id !== AUTOSAVE_DRAFT_ID && draft.name === name);
  const now = Date.now();

  return saveDraft({
    id: existing?.id ?? `draft-${now}`,
    name,
    createdAt: now,
    updatedAt: now,
    resumeData: cloneResumeData(data),
  });
}

/**
 * Before the current resume is replaced, saves it as a draft unless it is empty, unchanged by the
 * replacement, or already saved as a named draft.
 */
export async function keepCopyBeforeReplacing(
  current: ResumeSchema,
  incoming: ResumeSchema,
  reason: ReplaceReason
): Promise<"not-needed" | "saved" | "failed"> {
  const snapshot = serializeNormalizedResume(current);
  if (
    snapshot === serializeNormalizedResume(EMPTY_RESUME) ||
    snapshot === serializeNormalizedResume(incoming)
  ) {
    return "not-needed";
  }

  const drafts = await listDrafts();
  if (drafts === null) return "failed";

  const alreadySaved = drafts.some(
    (draft) =>
      draft.id !== AUTOSAVE_DRAFT_ID && serializeNormalizedResume(draft.resumeData) === snapshot
  );
  if (alreadySaved) return "not-needed";

  const data = cloneResumeData(current);
  const now = Date.now();
  const saved = await saveDraft({
    id: `copy-${now}`,
    name: `${data.basics.name || "Untitled"} (${COPY_NAME_SUFFIX[reason]})`,
    createdAt: now,
    updatedAt: now,
    resumeData: data,
  });

  return saved ? "saved" : "failed";
}
