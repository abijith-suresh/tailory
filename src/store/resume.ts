import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import {
  DEFAULT_PAGE_FORMAT,
  DEFAULT_RESUME_ACCENT_COLOR,
  type PageFormat,
} from "@/lib/resume/design";
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

export const [selectedPageFormat, setSelectedPageFormat] =
  createSignal<PageFormat>(DEFAULT_PAGE_FORMAT);

export const [activeSection, setActiveSection] = createSignal<SectionId>("basics");

export interface ImportFeedback {
  confidence: number;
  work: number;
  education: number;
  skills: number;
  projects: number;
  certificates: number;
}

export const [exportError, setExportError] = createSignal("");

export const [importError, setImportError] = createSignal("");

export const [importFeedback, setImportFeedback] = createSignal<ImportFeedback | null>(null);

export function loadResume(data: ResumeSchema) {
  setResume(normalizeResume(data));
}

export function resetResume() {
  setResume(normalizeResume(EMPTY_RESUME));
}
