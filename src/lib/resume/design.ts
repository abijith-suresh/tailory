import type { TemplateId } from "@/types/template";

export type PdfMargin = [number, number, number, number];

export interface ResumeDesignInput {
  template: TemplateId;
  accentColor?: string;
}

export interface ResumeDesignSettings {
  template: TemplateId;
  accentColor: string;
}

/** The site's ink. A colour the user picks replaces it. */
export const DEFAULT_RESUME_ACCENT_COLOR = "#1b1c20";
export const RESUME_PREVIEW_FONT_FAMILY = '"Roboto", Arial, sans-serif';
export const RESUME_PREVIEW_PAGE_MIN_HEIGHT = 842;

export function resolveResumeDesignSettings(input: ResumeDesignInput): ResumeDesignSettings {
  return {
    template: input.template,
    accentColor: input.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR,
  };
}
