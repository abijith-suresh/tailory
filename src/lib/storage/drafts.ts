import {
  AUTOSAVE_DRAFT_ID,
  getDraft,
  isDraftStorageAvailable,
  type ResumeDraft,
  saveDraft,
} from "@/lib/storage/db";
import { normalizeResume, serializeNormalizedResume } from "@/lib/resume/normalize";
import type { ResumeSchema } from "@/types/resume";

export function cloneResumeData(data: ResumeSchema): ResumeSchema {
  return normalizeResume(data);
}

export async function restoreAutosaveDraft(): Promise<{
  available: boolean;
  draft?: ResumeDraft;
  snapshotJson?: string;
}> {
  const available = await isDraftStorageAvailable();

  if (!available) {
    return { available: false };
  }

  const draft = await getDraft(AUTOSAVE_DRAFT_ID);

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
  const data: ResumeSchema = JSON.parse(snapshotJson);
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
