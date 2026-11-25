import type { TDocumentDefinitions } from "pdfmake/interfaces";

import type { PdfTemplateOptions } from "../export/template-types.ts";
import type { ResumeDesignSettings } from "../resume/design.ts";
import type { ResumeSchema } from "../types/resume.ts";
import { TEMPLATE_IDS, type TemplateId } from "../types/template.ts";
import { buildCompactAtsRenderModel, compactAtsTemplate } from "./compact-ats.ts";
import { buildMinimalRenderModel, minimalTemplate } from "./minimal.ts";
import { buildModernRenderModel, modernTemplate } from "./modern.ts";
import type { ResumeRenderModel } from "./render-model.ts";

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
    label: "Compact",
    description: "Dense, single column",
    buildRenderModel: buildCompactAtsRenderModel,
    renderPdf: compactAtsTemplate,
  },
} satisfies Record<TemplateId, TemplateRegistryEntry>;

export const TEMPLATE_OPTIONS: TemplateMetadata[] = TEMPLATE_IDS.map((id) => ({
  id,
  label: TEMPLATE_REGISTRY[id].label,
  description: TEMPLATE_REGISTRY[id].description,
}));

export function loadPdfTemplateRenderer(templateId: TemplateId): PdfTemplateRenderer {
  return TEMPLATE_REGISTRY[templateId].renderPdf;
}

export function buildResumeRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  return TEMPLATE_REGISTRY[design.template].buildRenderModel(resume, design);
}
