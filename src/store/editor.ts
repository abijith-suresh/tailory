import { createSignal } from "solid-js";

import type { TemplateId } from "@/types/template";
import { setVersionTemplate, toggleExcluded, versions } from "./document";
import { selectedTemplate, setSelectedTemplate } from "./resume";

/** The version open in the editor, or null for the master. */
export const [activeVersionId, setActiveVersionId] = createSignal<string | null>(null);

/** The open version. A stale id, such as one deleted or replaced by an import, means the master. */
export function activeVersion() {
  const id = activeVersionId();
  return id === null ? undefined : versions.find((version) => version.id === id);
}

/** The open version dialog: adding a version, renaming the open one, or none. */
export const [versionDialog, setVersionDialog] = createSignal<"create" | "rename" | null>(null);

export type EditorView = "edit" | "preview";

/** Which half of the editor a phone shows. Wider screens show both. */
export const [editorView, setEditorView] = createSignal<EditorView>("edit");

/**
 * An entry or bullet added while a version is open belongs to that version: the master gets it,
 * and every other version leaves it out.
 */
export function keepOnlyInActiveVersion(itemId: string) {
  const current = activeVersion();
  if (!current) return;
  for (const version of versions) {
    if (version.id !== current.id && !version.excluded.includes(itemId)) {
      toggleExcluded(version.id, itemId);
    }
  }
}

/** The template of the open version, or the editor's template on the master. */
export function currentTemplate(): TemplateId {
  return activeVersion()?.templateId ?? selectedTemplate();
}

export function setCurrentTemplate(templateId: TemplateId) {
  const version = activeVersion();
  if (version) setVersionTemplate(version.id, templateId);
  else setSelectedTemplate(templateId);
}
