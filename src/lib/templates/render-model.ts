import type { PdfMargin, ResumeDesignSettings } from "@/lib/resume/design";
import type { TemplateId } from "@/types/template";

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
  id:
    | "summary"
    | "work"
    | "volunteer"
    | "education"
    | "awards"
    | "publications"
    | "skills"
    | "languages"
    | "interests"
    | "projects"
    | "references"
    | "certificates";
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
