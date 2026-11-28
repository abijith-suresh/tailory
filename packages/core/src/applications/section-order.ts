import type { ResumeRenderModel } from "../templates/render-model.ts";
import { RESUME_SECTION_KEYS, type ResumeSectionKey } from "../types/application.ts";

const SECTION_KEY_SET = new Set<string>(RESUME_SECTION_KEYS);

/**
 * Keeps known sections in the given order, once each, and appends any missing ones in the
 * default order, so a saved order always lists every section.
 */
export function normalizeSectionOrder(order: unknown): ResumeSectionKey[] {
  const listed = Array.isArray(order)
    ? order.filter((key): key is ResumeSectionKey => SECTION_KEY_SET.has(key))
    : [];
  const unique = [...new Set(listed)];
  return [...unique, ...RESUME_SECTION_KEYS.filter((key) => !unique.includes(key))];
}

/** Puts sections in the given order. Without an order they keep the template's order. */
export function orderSections<T extends { id: ResumeSectionKey }>(
  sections: readonly T[],
  order?: readonly ResumeSectionKey[]
): T[] {
  if (!order) return [...sections];

  const rank = new Map(normalizeSectionOrder(order).map((key, index) => [key, index]));
  return [...sections].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/**
 * Reorders a render model's sections. Dividers belong to positions on the page, not to sections,
 * so a template that rules off every section but the last still does after a reorder.
 */
export function applySectionOrder(
  model: ResumeRenderModel,
  order?: readonly ResumeSectionKey[]
): ResumeRenderModel {
  if (!order) return model;

  return {
    ...model,
    sections: orderSections(model.sections, order).map((section, index) => ({
      ...section,
      dividerAfter: model.sections[index]?.dividerAfter,
    })),
  };
}

/** The order a profile prints its sections in, and new applications start from. */
export function profileSectionOrder(profile: { sectionOrder?: unknown }): ResumeSectionKey[] {
  return normalizeSectionOrder(profile.sectionOrder);
}

/** Scales a render model's page margins, so its rules still span the width between them. */
export function scalePageMargins(model: ResumeRenderModel, scale = 1): ResumeRenderModel {
  if (scale === 1) return model;
  const [left, top, right, bottom] = model.pageMargins;
  const scaled = (value: number) => Math.round(value * scale * 100) / 100;
  return { ...model, pageMargins: [scaled(left), scaled(top), scaled(right), scaled(bottom)] };
}
