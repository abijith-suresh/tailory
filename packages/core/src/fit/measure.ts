import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

/** Where pdfmake put a block: its page, and its top edge in points from the top of the page. */
interface BlockPosition {
  pageNumber: number;
  top: number;
  pageInnerHeight: number;
}

interface NodeInfo {
  id?: string;
  startPosition?: BlockPosition;
  pageNumbers?: number[];
}

/** How a document falls onto pages. */
export interface PageLayout {
  pageCount: number;
  /** For each page after the first, the block it starts with. */
  pageStarts: { page: number; blockId: string }[];
  /** Points of content past the end of page `pages`. 0 when it fits. */
  heightPast: (pages: number) => number;
  /** How much of the last page the content uses, from 0 to 1. */
  lastPageFill: number;
}

/** Lays out a document and reports its pages. */
export type MeasurePages = (doc: TDocumentDefinitions) => Promise<PageLayout>;

/**
 * The part of pdfmake a measure needs: something that lays a document out. The caller loads
 * pdfmake and registers the fonts the templates use (Roboto), in the browser or in Node; core
 * never imports pdfmake itself.
 */
export interface PdfLayoutRuntime {
  createPdf: (doc: TDocumentDefinitions) => { getBuffer: () => Promise<unknown> };
}

const END_ID = "end-of-content";

/**
 * A line with no height after everything else, so the end of the content can be found. pdfmake
 * writes into it, so each measure gets a new one.
 */
const endMarker = () => ({ text: " ", lineHeight: 0, id: END_ID }) as unknown as Content;

function pageMarginTop(doc: TDocumentDefinitions): number {
  const margins = doc.pageMargins;
  if (typeof margins === "number") return margins;
  if (Array.isArray(margins)) return margins.length === 2 ? margins[1] : (margins[1] ?? 0);
  return 0;
}

/**
 * Measures pages with pdfmake's own layout, so the numbers are the export's. pdfmake reports each
 * block it places to `pageBreakBefore`; returning false leaves the layout as it is. Only the first
 * page is drawn, which keeps a measure quick.
 */
export function createPageMeasurer(
  loadRuntime: () => PdfLayoutRuntime | Promise<PdfLayoutRuntime>
): MeasurePages {
  return async (source) => {
    const pdfMake = await loadRuntime();
    // pdfmake writes into the nodes it lays out, so give it a copy.
    const { pageBreakBefore: breakBefore, ...plain } = source;
    const doc = structuredClone(plain);
    const blocks: NodeInfo[] = [];

    await pdfMake
      .createPdf({
        ...doc,
        content: [doc.content, endMarker()],
        maxPagesNumber: 1,
        // pdfmake asks about each block once. The document's own rule can move a block to the
        // next page; pdfmake then lays out again and asks only about the blocks after it.
        pageBreakBefore: (node: NodeInfo, nodes: unknown) => {
          const moves = Boolean(breakBefore?.(node as never, nodes as never));
          const at = node.startPosition;
          blocks.push(
            moves && at
              ? {
                  ...node,
                  pageNumbers: [at.pageNumber + 1],
                  startPosition: { ...at, pageNumber: at.pageNumber + 1, top: pageMarginTop(doc) },
                }
              : node
          );
          return moves;
        },
      } as TDocumentDefinitions)
      .getBuffer();

    const content = blocks.filter((block) => block.id !== END_ID);
    const pageCount = Math.max(1, ...content.flatMap((block) => block.pageNumbers ?? []));
    // A margin can leave no room on the last page, which pushes the marker onto a page of its
    // own. The content then ends at the foot of the page before.
    const marker = blocks.find((block) => block.id === END_ID)?.startPosition;
    const end =
      marker && marker.pageNumber > pageCount
        ? { ...marker, pageNumber: pageCount, top: pageMarginTop(doc) + marker.pageInnerHeight }
        : marker;

    const pageStarts: PageLayout["pageStarts"] = [];
    for (const block of content) {
      if (!block.id) continue;
      for (const page of block.pageNumbers ?? []) {
        if (page > 1 && !pageStarts.some((start) => start.page === page)) {
          pageStarts.push({ page, blockId: block.id });
        }
      }
    }
    pageStarts.sort((a, b) => a.page - b.page);

    const top = pageMarginTop(doc);
    const heightPast = (pages: number) => {
      if (!end || pageCount <= pages) return 0;
      // Whole pages in between, then the part of the last page that is used.
      const between = Math.max(0, pageCount - pages - 1) * end.pageInnerHeight;
      return between + Math.max(0, end.top - top);
    };

    const lastPageFill =
      end && end.pageInnerHeight > 0
        ? Math.min(1, Math.max(0, (end.top - top) / end.pageInnerHeight))
        : 0;

    return {
      pageCount,
      pageStarts,
      heightPast,
      lastPageFill: Math.round(lastPageFill * 1000) / 1000,
    };
  };
}
