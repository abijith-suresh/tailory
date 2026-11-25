export const TEMPLATE_IDS = ["modern", "minimal", "compact-ats"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = "modern";
