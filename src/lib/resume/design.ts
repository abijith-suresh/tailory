import type { TemplateId } from "@/types/template";

export type PdfMargin = [number, number, number, number];

export type PageFormat = "A4" | "Letter";

export interface ResumeTypographyInput {
  pdfFontFamily?: string;
  previewFontFamily?: string;
}

export interface ResumeDesignInput {
  template: TemplateId;
  accentColor?: string;
  pageFormat?: PageFormat;
  pageMargins?: PdfMargin;
  typography?: ResumeTypographyInput;
}

export interface ResumeDesignSettings {
  template: TemplateId;
  accentColor: string;
  pageFormat: PageFormat;
  pageHeight: number;
  pageMargins?: PdfMargin;
  pageSize: "A4" | "LETTER";
  pageWidth: number;
  pdfFontFamily: string;
  previewFontFamily: string;
  previewPageMinHeight: number;
  previewPageWidth: number;
}

export const DEFAULT_RESUME_ACCENT_COLOR = "#1d6648";
export const DEFAULT_PAGE_FORMAT: PageFormat = "A4";
export const DEFAULT_RESUME_PREVIEW_FONT_FAMILY = '"Roboto", "Geist", Arial, sans-serif';
export const DEFAULT_RESUME_PDF_FONT_FAMILY = "Roboto";

const PAGE_FORMAT_DIMENSIONS: Record<
  PageFormat,
  {
    pageHeight: number;
    pageSize: "A4" | "LETTER";
    pageWidth: number;
    previewPageMinHeight: number;
    previewPageWidth: number;
  }
> = {
  A4: {
    pageSize: "A4",
    pageWidth: 595.28,
    pageHeight: 841.89,
    previewPageWidth: 680,
    previewPageMinHeight: 842,
  },
  Letter: {
    pageSize: "LETTER",
    pageWidth: 612,
    pageHeight: 792,
    previewPageWidth: 680,
    previewPageMinHeight: 816,
  },
};

export function resolveResumeDesignSettings(input: ResumeDesignInput): ResumeDesignSettings {
  const pageFormat = input.pageFormat ?? DEFAULT_PAGE_FORMAT;
  const dimensions = PAGE_FORMAT_DIMENSIONS[pageFormat];

  return {
    template: input.template,
    accentColor: input.accentColor ?? DEFAULT_RESUME_ACCENT_COLOR,
    pageFormat,
    pageMargins: input.pageMargins,
    pageSize: dimensions.pageSize,
    pageWidth: dimensions.pageWidth,
    pageHeight: dimensions.pageHeight,
    previewPageWidth: dimensions.previewPageWidth,
    previewPageMinHeight: dimensions.previewPageMinHeight,
    previewFontFamily: input.typography?.previewFontFamily ?? DEFAULT_RESUME_PREVIEW_FONT_FAMILY,
    pdfFontFamily: input.typography?.pdfFontFamily ?? DEFAULT_RESUME_PDF_FONT_FAMILY,
  };
}

export function resolvePageMargins(
  design: ResumeDesignSettings,
  fallbackMargins: PdfMargin
): PdfMargin {
  return design.pageMargins ?? fallbackMargins;
}
