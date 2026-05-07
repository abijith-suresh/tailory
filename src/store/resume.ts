import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import { DEFAULT_RESUME_ACCENT_COLOR } from "@/lib/resume/design";
import { normalizeResume } from "@/lib/resume/normalize";
import { DEFAULT_TEMPLATE_ID, type TemplateId } from "@/types/template";
import { EMPTY_RESUME } from "@/types/resume";
import type { ResumeSchema, SectionId } from "@/types/resume";

// Deep clone to avoid sharing the same reference
const defaultResume: ResumeSchema = JSON.parse(JSON.stringify(EMPTY_RESUME));

export const [resume, setResume] = createStore<ResumeSchema>(defaultResume);

export const [selectedTemplate, setSelectedTemplate] =
  createSignal<TemplateId>(DEFAULT_TEMPLATE_ID);

export const [selectedAccentColor, setSelectedAccentColor] = createSignal(
  DEFAULT_RESUME_ACCENT_COLOR
);

export const [activeSection, setActiveSection] = createSignal<SectionId>("basics");

export interface ImportFeedback {
  confidence: number;
  work: number;
  education: number;
  skills: number;
  projects: number;
  certificates: number;
}

export interface ImportReviewState {
  dismissed: boolean;
  feedback: ImportFeedback;
}

export const [exportError, setExportError] = createSignal("");

export const [importError, setImportError] = createSignal("");

export const [importReview, setImportReview] = createSignal<ImportReviewState | null>(null);

export function showImportReview(feedback: ImportFeedback) {
  setImportReview({
    feedback,
    dismissed: false,
  });
}

export function dismissImportReview() {
  setImportReview((current) => (current ? { ...current, dismissed: true } : null));
}

export function clearImportReview() {
  setImportReview(null);
}

export function loadResume(data: ResumeSchema) {
  setResume(normalizeResume(data));
}

export function resetResume() {
  setResume(normalizeResume(EMPTY_RESUME));
}
