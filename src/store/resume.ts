import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/resume/design";
import { normalizeResume } from "@/lib/resume/normalize";
import type { ImportFeedback } from "@/lib/upload/import-resume";
import type { ResumeSchema, SectionId } from "@/types/resume";
import { EMPTY_RESUME } from "@/types/resume";
import { DEFAULT_TEMPLATE_ID, type TemplateId } from "@/types/template";

// Deep clone to avoid sharing the same reference
const defaultResume: ResumeSchema = JSON.parse(JSON.stringify(EMPTY_RESUME));

export const [resume, setResume] = createStore<ResumeSchema>(defaultResume);

export const [selectedTemplate, setSelectedTemplate] =
  createSignal<TemplateId>(DEFAULT_TEMPLATE_ID);

export const [selectedAccentColor] = createSignal(DEFAULT_RESUME_ACCENT_COLOR);

export const [activeSection, setActiveSection] = createSignal<SectionId>("basics");

export const [exportError, setExportError] = createSignal("");

export const [importError, setImportError] = createSignal("");

export const [importFeedback, setImportFeedback] = createSignal<ImportFeedback | null>(null);

export const [draftStorageError, setDraftStorageError] = createSignal("");

export function loadResume(data: ResumeSchema) {
  setResume(normalizeResume(data));
}
