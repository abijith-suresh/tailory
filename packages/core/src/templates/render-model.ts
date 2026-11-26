import type { PdfMargin, ResumeDesignSettings } from "../resume/design.ts";
import type { ResumeSectionKey } from "../types/application.ts";
import type { TemplateId } from "../types/template.ts";

export interface ResumeHeaderModel {
  contactLine?: string;
  dividerAfter?: boolean;
  label?: string;
  name: string;
  urlLine?: string;
}

export interface ResumeEntryModel {
  body?: string;
  bullets?: string[];
  details?: string[];
  link?: string;
  meta?: string;
  spacerAfter?: number;
  subtitle?: string;
  subtitleMode?: "inline" | "stacked";
  title: string;
}

export interface ResumeSectionModel {
  dividerAfter?: boolean;
  entries?: ResumeEntryModel[];
  id: ResumeSectionKey;
  kind: "text" | "entries";
  text?: string;
  title: string;
}

export interface ResumeRenderModel {
  design: ResumeDesignSettings;
  header: ResumeHeaderModel;
  pageMargins: PdfMargin;
  sections: ResumeSectionModel[];
  template: TemplateId;
}
