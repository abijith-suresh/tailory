import type { Content, Node, TDocumentDefinitions } from "pdfmake/interfaces";
import { applyFitStep, type FitStep, UNTIGHTENED } from "@/lib/fit/steps";
import { loadPdfTemplateRenderer } from "@/lib/templates/registry";
import type { ResumeSectionKey } from "@/types/document";
import type { ResumeSchema } from "@/types/resume";
import type { TemplateId } from "@/types/template";

export interface PdfDocumentOptions {
  accentColor?: string;
  /** How far to tighten. Defaults to the template as designed. */
  fitStep?: FitStep;
  /** A version's section order. Without one, sections print in the template's order. */
  sectionOrder?: readonly ResumeSectionKey[];
}

/** The id pdfmake reports a block by, which the preview puts on the same block. */
export const blockId = (index: number) => `block-${index}`;

/**
 * Names every block of the page in reading order: each line of text, row and rule a stack holds.
 * The parts of a row are not blocks; the row is.
 */
function nameBlocks(content: Content, next: { index: number }): Content {
  if (Array.isArray(content)) return content.map((item) => nameBlocks(item, next));
  if (typeof content !== "object" || content === null) return content;

  const node = content as unknown as Record<string, unknown>;
  if (Array.isArray(node.stack)) {
    return { ...node, stack: nameBlocks(node.stack as Content, next) } as unknown as Content;
  }
  return { ...node, id: blockId(next.index++) } as unknown as Content;
}

/**
 * Keeps a section heading on the same page as what it heads. Headings and their rules carry
 * `headlineLevel: 1`; a heading with nothing else after it on its page moves to the next page.
 */
export function keepHeadingsWithContent(
  node: Node,
  nodes: {
    getFollowingNodesOnPage: () => Node[];
    getPreviousNodesOnPage: () => Node[];
  }
): boolean {
  if (node.headlineLevel !== 1 || node.stack) return false;
  const headsSomething = nodes
    .getFollowingNodesOnPage()
    .some((next) => next.headlineLevel !== 1 && !next.stack);
  // A heading already first on its page has nowhere better to go.
  return !headsSomething && nodes.getPreviousNodesOnPage().length > 0;
}

/**
 * The PDF of a resume as pdfmake describes it. The export prints it, the fit measures it, and the
 * preview draws it, so all three lay out the same page.
 */
export function buildPdfDocument(
  resume: ResumeSchema,
  template: TemplateId,
  options: PdfDocumentOptions = {}
): TDocumentDefinitions {
  const doc = loadPdfTemplateRenderer(template)(resume, {
    accentColor: options.accentColor,
    sectionOrder: options.sectionOrder,
  });
  const fitted = applyFitStep(doc, options.fitStep ?? UNTIGHTENED);
  return {
    ...fitted,
    content: nameBlocks(fitted.content, { index: 0 }),
    pageBreakBefore: keepHeadingsWithContent,
  };
}
