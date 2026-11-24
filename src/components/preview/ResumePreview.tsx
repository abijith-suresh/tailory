import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";

import TemplateSelect from "@/components/editor/TemplateSelect";
import ResumeDocument from "@/components/resume/ResumeDocument";
import {
  RESUME_PREVIEW_FONT_FAMILY,
  RESUME_PREVIEW_PAGE_MIN_HEIGHT,
  resolveResumeDesignSettings,
} from "@/lib/resume/design";
import { isResumeEmpty } from "@/lib/sections/registry";
import { countKept } from "@/lib/versions/counts";
import { resolveVersion } from "@/lib/versions/resolve";
import { currentDocument } from "@/store/document";
import { activeVersion, currentTemplate } from "@/store/editor";
import { selectedAccentColor } from "@/store/resume";

const PAGE_WIDTH = 680;
/** Canvas padding on each side, in px, matching p-4 and md:p-8. */
const GUTTER = { narrow: 16, wide: 32 };

/**
 * The open version as it will print, on a page scaled to fit the column. The page keeps its own
 * width and is zoomed, so line breaks match the export.
 */
export default function ResumePreview() {
  const [scale, setScale] = createSignal(1);
  let canvas!: HTMLDivElement;

  const shown = createMemo(() => resolveVersion(currentDocument(), activeVersion()?.id ?? null));
  const design = () =>
    resolveResumeDesignSettings({
      template: currentTemplate(),
      accentColor: selectedAccentColor(),
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
          <div
            class="resume-document__page mx-auto bg-sheet p-10 text-xs leading-relaxed text-[#111827] shadow-sheet"
            style={{
              width: `${PAGE_WIDTH}px`,
              zoom: scale(),
              "font-family": RESUME_PREVIEW_FONT_FAMILY,
              "min-height": `${RESUME_PREVIEW_PAGE_MIN_HEIGHT}px`,
            }}
            role="document"
            aria-label={`Preview of ${activeVersion()?.name ?? "Master"}`}
          >
            <ResumeDocument design={design()} resume={shown()} />
          </div>
        </Show>
      </div>
    </div>
  );
}
