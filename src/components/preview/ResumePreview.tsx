import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";

import { FitReadout } from "@/components/editor/PageFit";
import TemplateSelect from "@/components/editor/TemplateSelect";
import { fitDocument } from "@/lib/fit/fit";
import { UNTIGHTENED } from "@/lib/fit/steps";
import { isResumeEmpty } from "@/lib/sections/registry";
import { countKept } from "@/lib/versions/counts";
import { resolveVersion } from "@/lib/versions/resolve";
import { currentDocument } from "@/store/document";
import { activeVersion } from "@/store/editor";
import { shownFit, shownFitInput } from "@/store/fit";
import PdfPage, { A4_WIDTH_PT, type PageBreakMark, PX_PER_PT } from "./PdfPage";

const PAGE_WIDTH = A4_WIDTH_PT * PX_PER_PT;
/** Canvas padding on each side, in px, matching p-4 and md:p-8. */
const GUTTER = { narrow: 16, wide: 32 };

/**
 * The open version as it will print, on a page scaled to fit the column. The page is the PDF's own
 * document drawn at A4 size and zoomed, so line breaks match the export. Page breaks and
 * tightening come from measuring that document with pdfmake.
 */
export default function ResumePreview() {
  const [scale, setScale] = createSignal(1);
  let canvas!: HTMLDivElement;

  const shown = createMemo(() => resolveVersion(currentDocument(), activeVersion()?.id ?? null));
  const doc = createMemo(() => fitDocument(shownFitInput(), shownFit()?.step ?? UNTIGHTENED));
  const breaks = createMemo(() => {
    const fit = shownFit();
    const marks = new Map<string, PageBreakMark>();
    for (const start of fit?.pageStarts ?? []) {
      const over = fit?.pageTarget != null && start.page > fit.pageTarget;
      marks.set(start.blockId, { page: start.page, over });
    }
    return marks;
  });

  onMount(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = entry.contentRect.width;
      const gutter = width >= 640 ? GUTTER.wide : GUTTER.narrow;
      setScale(Math.min(1, (width - gutter * 2) / PAGE_WIDTH));
    });
    observer.observe(canvas);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-2 md:hidden">
        <div class="min-w-0">
          <Show when={activeVersion()} fallback={<p class="text-ui-sm text-fg-muted">Master</p>}>
            {(version) => {
              const count = () => countKept(currentDocument().master, version());
              return (
                <p class="font-mono text-ui-xs text-keep">
                  {count().kept} of {count().total} kept
                </p>
              );
            }}
          </Show>
          <FitReadout />
        </div>
        <TemplateSelect id="template-select-phone" />
      </div>
      <div ref={canvas} class="min-h-0 flex-1 overflow-auto p-4 sm:p-8">
        <Show
          when={!isResumeEmpty(shown())}
          fallback={
            <div class="mx-auto mt-16 max-w-xs text-center">
              <h2 class="text-ui-md">Nothing to preview yet</h2>
              <p class="mt-2 text-body-sm text-pretty text-fg-muted">
                Add your name in Basics, or import a resume from the menu under its name.
              </p>
            </div>
          }
        >
          <PdfPage
            doc={doc()}
            breaks={breaks()}
            class="mx-auto shadow-sheet"
            style={{ zoom: scale(), "--preview-scale": scale() }}
            role="document"
            aria-label={`Preview of ${activeVersion()?.name ?? "Master"}`}
          />
        </Show>
      </div>
    </div>
  );
}
