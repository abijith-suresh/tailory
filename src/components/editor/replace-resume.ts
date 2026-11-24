import { keepCopyBeforeReplacing, type ReplaceReason } from "@/lib/storage/drafts";
import { currentDocument, loadDocument } from "@/store/document";
import type { ResumeDocument } from "@/types/document";

/**
 * Replaces the resume and its versions in the editor after keeping a copy of the current one as a
 * draft. Asks first when the copy can't be saved. Returns false when the user cancels.
 */
export async function replaceResume(incoming: ResumeDocument, reason: ReplaceReason) {
  const copy = await keepCopyBeforeReplacing(currentDocument(), incoming, reason);
  if (
    copy === "failed" &&
    !window.confirm("Couldn't save a copy of your current resume. Replace it anyway?")
  ) {
    return false;
  }

  loadDocument(incoming);
  return true;
}
