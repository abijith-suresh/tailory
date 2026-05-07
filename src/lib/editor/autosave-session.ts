import { serializeNormalizedResume } from "@/lib/resume/normalize";
import { restoreAutosaveDraft, saveAutosaveDraft } from "@/lib/storage/drafts";
import type { ResumeSchema } from "@/types/resume";

import type { EditorEntryMode } from "./session-entry";

export interface AutosaveSessionInitResult {
  available: boolean;
  draft?: Awaited<ReturnType<typeof restoreAutosaveDraft>>["draft"];
  skippedRestore?: boolean;
  snapshotJson?: string;
}

export async function initializeAutosaveSession(
  entryMode: EditorEntryMode,
  currentResume: ResumeSchema
): Promise<AutosaveSessionInitResult> {
  if (entryMode === "restore-autosave") {
    return restoreAutosaveDraft();
  }

  const snapshotJson = serializeNormalizedResume(currentResume);
  const saved = await saveAutosaveDraft(snapshotJson);

  if (!saved) {
    return {
      available: false,
      skippedRestore: true,
    };
  }

  return {
    available: true,
    skippedRestore: true,
    snapshotJson,
  };
}
