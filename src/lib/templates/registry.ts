import type { TDocumentDefinitions } from "pdfmake/interfaces";

import type { PdfTemplateOptions } from "@/lib/export/template-types";
import type { ResumeDesignSettings } from "@/lib/resume/design";
import { buildCompactAtsRenderModel, compactAtsTemplate } from "@/lib/templates/compact-ats";
import { buildMinimalRenderModel, minimalTemplate } from "@/lib/templates/minimal";
import { buildModernRenderModel, modernTemplate } from "@/lib/templates/modern";
import type { ResumeRenderModel } from "@/lib/templates/render-model";
import type { ResumeSchema } from "@/types/resume";
import { TEMPLATE_IDS, type TemplateId } from "@/types/template";

type PdfTemplateRenderer = (
  resume: ResumeSchema,
  options: PdfTemplateOptions
) => TDocumentDefinitions;

type TemplateModelBuilder = (
  resume: ResumeSchema,
  design: ResumeDesignSettings
) => ResumeRenderModel;

export interface TemplateMetadata {
  description: string;
  id: TemplateId;
  label: string;
}

interface TemplateRegistryEntry extends TemplateMetadata {
  buildRenderModel: TemplateModelBuilder;
  renderPdf: PdfTemplateRenderer;
}

export const TEMPLATE_REGISTRY = {
  modern: {
    id: "modern",
    label: "Modern",
    description: "Two-tone header, section dividers",
    buildRenderModel: buildModernRenderModel,
    renderPdf: modernTemplate,
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Clean whitespace, no decoration",
    buildRenderModel: buildMinimalRenderModel,
    renderPdf: minimalTemplate,
  },
  "compact-ats": {
    id: "compact-ats",
    label: "Compact ATS",
    description: "Dense, keyword-optimized",
    buildRenderModel: buildCompactAtsRenderModel,
    renderPdf: compactAtsTemplate,
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
  return TEMPLATE_REGISTRY[templateId].renderPdf;
}

export function buildResumeRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  return TEMPLATE_REGISTRY[design.template].buildRenderModel(resume, design);
}
