import { createSignal } from "solid-js";

import { announce } from "@/components/ui/announcer";
import { ChevronDown } from "@/components/ui/icons";
import Menu from "@/components/ui/Menu";
import { saveNamedDraft } from "@/lib/storage/drafts";
import { validateUploadFile } from "@/lib/upload/guardrails";
import { importResumeFile } from "@/lib/upload/import-resume";
import { currentDocument } from "@/store/document";
import { resume, setImportError, setImportFeedback } from "@/store/resume";
import { type Autosave, autosaveLabel } from "./autosave";
import { replaceResume } from "./replace-resume";
import SavedCopiesDialog from "./SavedCopiesDialog";

export const IMPORT_FAILED_MESSAGE =
  "Couldn't import this file. Try again or choose a different file.";

/**
 * The resume's name and save state, with what you can do to the resume as a whole: import a file,
 * save a copy, or open one.
 */
export default function ResumeMenu(props: { autosave: Autosave }) {
  const [isImporting, setIsImporting] = createSignal(false);
  const [copiesOpen, setCopiesOpen] = createSignal(false);
  let fileInput!: HTMLInputElement;

  const name = () => resume.basics.name.trim() || "Untitled resume";
  const status = () => (isImporting() ? "Importing…" : autosaveLabel(props.autosave.status()));

  const importFile = async (file: File) => {
    const validation = validateUploadFile(file);
    if (!validation.ok) {
      setImportError(validation.error);
      return;
    }

    setIsImporting(true);
    setImportError("");
    try {
      const outcome = await importResumeFile(file, validation.extension);
      if (!outcome.success) {
        setImportError(outcome.error);
        return;
      }
      if (!(await replaceResume(outcome.document, "import"))) return;
      if (outcome.feedback) setImportFeedback(outcome.feedback);
      else announce("Imported.");
    } catch {
      setImportError(IMPORT_FAILED_MESSAGE);
    } finally {
      setIsImporting(false);
    }
  };

  const saveCopy = async () => {
    const saved = await saveNamedDraft(currentDocument());
    announce(saved ? `Saved a copy of ${name()}.` : "Couldn't save a copy. Try again.");
  };

  return (
    <div class="min-w-0">
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx,.json"
        class="sr-only"
        tabIndex={-1}
        aria-label="Import resume file"
        onInput={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
          // Reset so the same file can be imported again.
          event.currentTarget.value = "";
        }}
      />
      <Menu
        align="start"
        ariaLabel={`Resume: ${name()}`}
        triggerProps={{ "aria-describedby": "save-status" }}
        triggerClass="btn-quiet -ml-2 min-h-11 max-w-full min-w-0 flex-col items-start! justify-center gap-0! px-2 py-1 text-left"
        label={
          <>
            <span class="flex max-w-full items-center gap-1 text-ui-sm">
              <span class="truncate">{name()}</span>
              <ChevronDown class="text-fg-subtle" />
            </span>
            <span
              id="save-status"
              data-testid="save-status"
              class="whitespace-nowrap text-body-xs text-fg-subtle max-lg:max-w-full max-lg:truncate"
            >
              {status()}
            </span>
          </>
        }
        items={[
          {
            label: "Import a file",
            detail: "PDF, DOCX, JSON Resume or a Tailory backup",
            disabled: isImporting(),
            onSelect: () => fileInput.click(),
          },
          {
            label: "Save a copy",
            detail: "Keeps this resume and its versions as they are now",
            disabled: !props.autosave.storageAvailable(),
            onSelect: () => void saveCopy(),
          },
          {
            label: "Saved copies",
            disabled: !props.autosave.storageAvailable(),
            onSelect: () => setCopiesOpen(true),
          },
        ]}
      />
      <SavedCopiesDialog open={copiesOpen()} onClose={() => setCopiesOpen(false)} />
    </div>
  );
}
