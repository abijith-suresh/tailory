import { Show } from "solid-js";

import { type CardPage, fitText } from "../../lib/board";

/** Small page outlines: one per page, the last filled as far as the content runs. */
const glyphs = (page: CardPage) => {
  const pages = Math.min(3, Math.max(1, page.fits ? page.pagesNeeded : (page.pageTarget ?? 1)));
  const fills = Array.from({ length: pages }, (_, index) =>
    index === pages - 1 && page.fits ? Math.round(page.lastPageFill * 100) : 100
  );
  // Over the target: a dashed page holding what runs past it.
  if (!page.fits) fills.push(Math.min(100, Math.max(15, page.linesOver * 6)));
  return fills;
};

/**
 * A card's page result: "1 page", or "3 lines over 1 page" in the over colour. The words say it
 * all; the page outlines are decoration.
 */
export function PageFit(props: { page: CardPage | null | undefined }) {
  return (
    <Show
      when={props.page}
      fallback={<span class="page-fit page-fit--none">Nothing to print</span>}
    >
      {(page) => (
        <span class="page-fit" data-state={page().fits ? "fits" : "over"}>
          <span class="page-fit__glyph" aria-hidden="true">
            {glyphs(page()).map((fill) => (
              <i style={{ "--fill": `${fill}%` }} />
            ))}
          </span>
          {fitText(page())}
        </span>
      )}
    </Show>
  );
}
