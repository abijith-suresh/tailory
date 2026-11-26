import type { ResumeSectionKey } from "../types/application.ts";

export interface PdfTemplateOptions {
  accentColor?: string;
  /** An application's section order. Without one, sections print in the template's order. */
  sectionOrder?: readonly ResumeSectionKey[];
}
