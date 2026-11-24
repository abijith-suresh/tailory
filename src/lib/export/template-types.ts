import type { ResumeSectionKey } from "@/types/document";

export interface PdfTemplateOptions {
  accentColor?: string;
  /** A version's section order. Without one, sections print in the template's order. */
  sectionOrder?: readonly ResumeSectionKey[];
}
