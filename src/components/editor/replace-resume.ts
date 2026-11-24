import { requestConfirm } from "@/components/ui/confirm";
import { keepCopyBeforeReplacing, type ReplaceReason } from "@/lib/storage/drafts";
import { currentDocument, loadDocument } from "@/store/document";
import { setActiveVersionId } from "@/store/editor";
import type { ResumeDocument } from "@/types/document";

/**
 * Replaces the resume and its versions in the editor after keeping a copy of the current one.
 * Asks first when the copy can't be saved. Returns false when the user cancels.
 */
export async function replaceResume(incoming: ResumeDocument, reason: ReplaceReason) {
  const copy = await keepCopyBeforeReplacing(currentDocument(), incoming, reason);
  if (
    copy === "failed" &&
    !(await requestConfirm({
      title: "Replace without a copy?",
      body: "Couldn't save a copy of your current resume. If you go on, it's replaced and can't be brought back.",
      confirmLabel: "Replace anyway",
      danger: true,
    }))
  ) {
    return false;
  }

  loadDocument(incoming);
  setActiveVersionId(null);
  return true;
}
