import type { PageFormat, PdfMargin, ResumeTypographyInput } from "@/lib/resume/design";

export interface PdfTemplateOptions {
  accentColor?: string;
  fontFamily: string;
  pageFormat?: PageFormat;
  pageMargins?: PdfMargin;
  typography?: ResumeTypographyInput;
}

export type { PdfMargin };
