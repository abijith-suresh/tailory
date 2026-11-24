import type { Content, Style, TDocumentDefinitions } from "pdfmake/interfaces";
import type { TemplateId } from "@/types/template";

/**
 * How much a resume is tightened. Each value multiplies the template's own: `space` the vertical
 * gaps, `leading` the line heights, `text` the font sizes. 1 everywhere is the template as designed.
 */
export interface FitStep {
  space: number;
  leading: number;
  text: number;
}

/** The tightest a template may go. Past these it reads as cramped. */
export interface FitBounds {
  space: number;
  leading: number;
  text: number;
}

export const UNTIGHTENED: FitStep = { space: 1, leading: 1, text: 1 };

/** Spacing and line height first, in these many even steps, so it tightens no more than needed. */
const SPACING_STEPS = 6;
/** Then text size, in these many even steps, with spacing at its tightest. */
const TEXT_STEPS = 2;

export const FIT_BOUNDS: Record<TemplateId, FitBounds> = {
  // Entries keep at least 60% of their gaps, so they stay visibly apart.
  modern: { space: 0.6, leading: 0.88, text: 0.9 },
  minimal: { space: 0.6, leading: 0.88, text: 0.9 },
  // Compact is dense already, so it has less room to give.
  "compact-ats": { space: 0.7, leading: 0.9, text: 0.95 },
};

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * Every step from the template as designed to its tightest, in order. Step 0 is untightened.
 * Spacing and line height tighten first; text gets smaller only once they are at their bounds.
 */
export function fitSteps(template: TemplateId): FitStep[] {
  const bounds = FIT_BOUNDS[template];
  const steps: FitStep[] = [UNTIGHTENED];

  for (let i = 1; i <= SPACING_STEPS; i += 1) {
    const amount = i / SPACING_STEPS;
    steps.push({
      space: lerp(1, bounds.space, amount),
      leading: lerp(1, bounds.leading, amount),
      text: 1,
    });
  }
  for (let i = 1; i <= TEXT_STEPS; i += 1) {
    steps.push({
      space: bounds.space,
      leading: bounds.leading,
      text: lerp(1, bounds.text, i / TEXT_STEPS),
    });
  }

  return steps;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

type Margin = Style["margin"];

/** Scales the top and bottom of a pdfmake margin. Left and right stay as they are. */
function scaleMargin(margin: Margin, space: number): Margin {
  if (margin === undefined) return margin;
  if (typeof margin === "number")
    return [margin, round(margin * space), margin, round(margin * space)];
  if (margin.length === 2) return [margin[0], round(margin[1] * space)];
  return [margin[0], round(margin[1] * space), margin[2], round(margin[3] * space)];
}

/** Line heights never drop below single spacing. */
const scaleLeading = (lineHeight: number, leading: number) =>
  round(Math.max(1, lineHeight * leading));

function scaleStyle(style: Style, step: FitStep): Style {
  const scaled: Style = { ...style };
  if (scaled.fontSize !== undefined) scaled.fontSize = round(scaled.fontSize * step.text);
  if (scaled.lineHeight !== undefined)
    scaled.lineHeight = scaleLeading(scaled.lineHeight, step.leading);
  if (scaled.margin !== undefined) scaled.margin = scaleMargin(scaled.margin, step.space);
  return scaled;
}

function scaleContent(content: Content, step: FitStep): Content {
  if (Array.isArray(content)) return content.map((item) => scaleContent(item, step));
  if (typeof content !== "object" || content === null) return content;

  const node = { ...(content as unknown as Record<string, unknown>) } as Record<string, unknown> &
    Style;
  Object.assign(node, scaleStyle(node, step));
  if (Array.isArray(node.stack)) node.stack = scaleContent(node.stack as Content, step);
  if (Array.isArray(node.columns)) node.columns = scaleContent(node.columns as Content, step);
  return node as unknown as Content;
}

/**
 * The document tightened by one step: gaps, line heights and font sizes, in its styles and on
 * every node. Widths, page margins and rules keep their size.
 */
export function applyFitStep(doc: TDocumentDefinitions, step: FitStep): TDocumentDefinitions {
  if (step.space === 1 && step.leading === 1 && step.text === 1) return doc;

  return {
    ...doc,
    content: scaleContent(doc.content, step),
    styles: Object.fromEntries(
      Object.entries(doc.styles ?? {}).map(([name, style]) => [name, scaleStyle(style, step)])
    ),
    defaultStyle: doc.defaultStyle && scaleStyle(doc.defaultStyle, step),
  };
}
