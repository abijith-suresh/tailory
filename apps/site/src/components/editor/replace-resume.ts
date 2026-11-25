import type { ResumeSchema } from "@tailory/core";
import { keepCopyBeforeReplacing, type ReplaceReason } from "@/lib/storage/drafts";
import { loadResume, resume } from "@/store/resume";

/**
 * Replaces the resume in the editor after keeping a copy of the current one as a draft.
 * Asks first when the copy can't be saved. Returns false when the user cancels.
 */
export async function replaceResume(incoming: ResumeSchema, reason: ReplaceReason) {
  const copy = await keepCopyBeforeReplacing(resume, incoming, reason);
  if (
    copy === "failed" &&
    !window.confirm("Couldn't save a copy of your current resume. Replace it anyway?")
  ) {
    return false;
  }

  loadResume(incoming);
  return true;
}
