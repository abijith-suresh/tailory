import { createEffect, type JSX, onCleanup, Show } from "solid-js";

import { inlineAction } from "@/components/ui/buttons";
import { Close } from "@/components/ui/icons";
import type { ImportFeedback } from "@/lib/upload/import-resume";
import {
  draftStorageError,
  exportError,
  importError,
  importFeedback,
  otherTabActive,
  setDraftStorageError,
  setExportError,
  setImportError,
  setImportFeedback,
} from "@/store/resume";

export const OTHER_TAB_MESSAGE = "Tailory is open in another tab. Changes here aren't saved.";
const TOAST_DISMISS_DELAY = 5000;
const MAX_LISTED_IGNORED_FIELDS = 5;

function useAutoDismiss(isActive: () => boolean, dismiss: () => void) {
  createEffect(() => {
    if (!isActive()) return;
    const timer = setTimeout(dismiss, TOAST_DISMISS_DELAY);
    onCleanup(() => clearTimeout(timer));
  });
}

function Toast(props: {
  tone: "error" | "info";
  role: "alert" | "status";
  children: JSX.Element;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}) {
  return (
    <div
      role={props.role}
      class="pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-surface py-2 pr-1 pl-4 ring-1"
      classList={{
        "ring-danger/40": props.tone === "error",
        "ring-line-strong": props.tone === "info",
      }}
    >
      <span
        aria-hidden="true"
        class="mt-3 size-2 shrink-0 rounded-full"
        classList={{ "bg-danger": props.tone === "error", "bg-primary": props.tone === "info" }}
      />
      <div class="min-w-0 flex-1 py-1.5 text-body-sm text-pretty">{props.children}</div>
      <Show when={props.action}>
        {(action) => (
          <button
            type="button"
            onClick={() => action().onClick()}
            class={`${inlineAction} mt-2 shrink-0 text-ui-sm`}
          >
            {action().label}
          </button>
        )}
      </Show>
      <Show when={props.onDismiss}>
        {(onDismiss) => (
          <button
            type="button"
            onClick={() => onDismiss()()}
            aria-label="Dismiss"
            class="btn-quiet size-9 shrink-0 text-fg-muted"
          >
            <Close />
          </button>
        )}
      </Show>
    </div>
  );
}

function ErrorToast(props: {
  message: () => string;
  onDismiss?: () => void;
  persistent?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  useAutoDismiss(
    () => !props.persistent && props.message().length > 0,
    () => props.onDismiss?.()
  );

  return (
    <Show when={props.message()}>
      <Toast tone="error" role="alert" action={props.action} onDismiss={props.onDismiss}>
        {props.message()}
      </Toast>
    </Show>
  );
}

function ignoredFieldsMessage(fields: string[]): string {
  const listed = fields.slice(0, MAX_LISTED_IGNORED_FIELDS).join(", ");
  const rest = fields.length - MAX_LISTED_IGNORED_FIELDS;
  const names = rest > 0 ? `${listed}, and ${rest} more` : listed;
  return `Tailory doesn't use these fields, so they weren't imported: ${names}.`;
}

function confidenceLabel(score: number): string {
  if (score >= 80) return "Imported.";
  if (score >= 50) return "Imported. Check each section.";
  return "Imported, but much may be missing or in the wrong place. Check each section.";
}

function importedParts(feedback: Exclude<ImportFeedback, { ignoredFields: string[] }>): string {
  const parts: string[] = [];
  const add = (count: number, one: string, many: string) => {
    if (count > 0) parts.push(`${count} ${count === 1 ? one : many}`);
  };
  add(feedback.work, "job", "jobs");
  add(feedback.education, "school", "schools");
  add(feedback.skills, "skill", "skills");
  add(feedback.projects, "project", "projects");
  add(feedback.certificates, "certificate", "certificates");
  return parts.length > 0 ? `Found ${parts.join(", ")}.` : "";
}

function ImportToast() {
  useAutoDismiss(
    () => importFeedback() !== null,
    () => setImportFeedback(null)
  );

  return (
    <Show when={importFeedback()}>
      {(feedback) => (
        <Toast tone="info" role="status" onDismiss={() => setImportFeedback(null)}>
          {(() => {
            const fb = feedback();
            if ("ignoredFields" in fb) return ignoredFieldsMessage(fb.ignoredFields);
            return `${confidenceLabel(fb.confidence)} ${importedParts(fb)}`.trim();
          })()}
        </Toast>
      )}
    </Show>
  );
}

/** Messages about import, export and saving, stacked under the top bar. */
export default function EditorToasts() {
  return (
    <div class="pointer-events-none fixed inset-x-4 top-4 z-40 mx-auto flex max-w-md flex-col gap-2">
      <ErrorToast message={exportError} onDismiss={() => setExportError("")} />
      <ErrorToast message={importError} onDismiss={() => setImportError("")} />
      <ErrorToast
        message={draftStorageError}
        onDismiss={() => setDraftStorageError("")}
        persistent
      />
      <ErrorToast
        message={() => (otherTabActive() ? OTHER_TAB_MESSAGE : "")}
        action={{ label: "Use this tab", onClick: () => otherTabActive()?.takeOver() }}
        persistent
      />
      <ImportToast />
    </div>
  );
}
