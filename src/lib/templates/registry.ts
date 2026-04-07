import type { TDocumentDefinitions } from "pdfmake/interfaces";

import type { PdfTemplateOptions } from "@/lib/export/template-types";
import type { ResumeSchema } from "@/types/resume";
import { TEMPLATE_IDS, type TemplateId } from "@/types/template";

type PdfTemplateRenderer = (
  resume: ResumeSchema,
  options: PdfTemplateOptions
) => TDocumentDefinitions;

export interface TemplateMetadata {
  description: string;
  id: TemplateId;
  label: string;
}

interface TemplateRegistryEntry extends TemplateMetadata {
  loadPdfRenderer: () => Promise<PdfTemplateRenderer>;
}

export const TEMPLATE_REGISTRY = {
  modern: {
    id: "modern",
    label: "Modern",
    description: "Two-tone header, section dividers",
    loadPdfRenderer: async () => {
      const { modernTemplate } = await import("@/lib/templates/modern");
      return modernTemplate;
    },
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Clean whitespace, no decoration",
    loadPdfRenderer: async () => {
      const { minimalTemplate } = await import("@/lib/templates/minimal");
      return minimalTemplate;
    },
  },
  "compact-ats": {
    id: "compact-ats",
    label: "Compact ATS",
    description: "Dense, keyword-optimized",
    loadPdfRenderer: async () => {
      const { compactAtsTemplate } = await import("@/lib/templates/compact-ats");
      return compactAtsTemplate;
    },
  },
} satisfies Record<TemplateId, TemplateRegistryEntry>;

export const TEMPLATE_OPTIONS: TemplateMetadata[] = TEMPLATE_IDS.map((id) => ({
  id,
  label: TEMPLATE_REGISTRY[id].label,
  description: TEMPLATE_REGISTRY[id].description,
}));

export async function loadPdfTemplateRenderer(
  templateId: TemplateId
): Promise<PdfTemplateRenderer> {
  return TEMPLATE_REGISTRY[templateId].loadPdfRenderer();
}
