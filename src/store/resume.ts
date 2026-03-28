import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeSchema, SectionId, TemplateId } from "@/types/resume";
import { EMPTY_RESUME } from "@/types/resume";

// Deep clone to avoid sharing the same reference
const defaultResume: ResumeSchema = JSON.parse(JSON.stringify(EMPTY_RESUME));

export const [resume, setResume] = createStore<ResumeSchema>(defaultResume);

export const [selectedTemplate, setSelectedTemplate] = createSignal<TemplateId>("modern");

export const [activeSection, setActiveSection] = createSignal<SectionId>("basics");

export function loadResume(data: ResumeSchema) {
  setResume(normalizeResume(data));
}

export function resetResume() {
  setResume(normalizeResume(EMPTY_RESUME));
}
