import type { TemplateId } from "../types/template.ts";

export type PdfMargin = [number, number, number, number];

export interface ResumeDesignInput {
  template: TemplateId;
  accentColor?: string;
}

export interface ResumeDesignSettings {
  template: TemplateId;
  accentColor: string;
}

export const DEFAULT_RESUME_ACCENT_COLOR = "#1d6648";
export const RESUME_PREVIEW_FONT_FAMILY = '"Roboto", Arial, sans-serif';
export const RESUME_PREVIEW_PAGE_MIN_HEIGHT = 842;

export function resolveResumeDesignSettings(input: ResumeDesignInput): ResumeDesignSettings {
  return {
    template: input.template,
    accentColor: input.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR,
  };
}
