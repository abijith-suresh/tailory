export const TEMPLATE_IDS = ["modern", "minimal", "compact-ats", "classic", "signal"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = "modern";

export function isTemplateId(value: string): value is TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId);
}
