import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import type { ResumeSchema, TemplateId } from "@/types/resume";
import { EMPTY_RESUME } from "@/types/resume";

// Deep clone to avoid sharing the same reference
const defaultResume: ResumeSchema = JSON.parse(JSON.stringify(EMPTY_RESUME));

export const [resume, setResume] = createStore<ResumeSchema>(defaultResume);

export const [selectedTemplate, setSelectedTemplate] = createSignal<TemplateId>("modern");

export function loadResume(data: ResumeSchema) {
  setResume(JSON.parse(JSON.stringify(data)));
}

export function resetResume() {
  setResume(JSON.parse(JSON.stringify(EMPTY_RESUME)));
}
