import { createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { type FitInput, type FitResult, fitResume } from "@/lib/fit/fit";
import { measurePages } from "@/lib/fit/measure-pdf";
import { normalizeResume } from "@/lib/resume/normalize";
import { resolveVersion } from "@/lib/versions/resolve";
import type { PageFit } from "@/types/document";
import { currentDocument, masterFit, setAutoFit, setPageTarget } from "./document";
import { activeVersion, currentTemplate } from "./editor";
import { selectedAccentColor } from "./resume";

/** Quiet time after the last change before measuring again. */
export const FIT_DEBOUNCE_MS = 300;

/** The open version's page target, or the master's. */
export function shownPageFit(): PageFit {
  const version = activeVersion();
  return version
    ? { pageTarget: version.pageTarget, autoFit: version.autoFit }
    : { pageTarget: masterFit.pageTarget, autoFit: masterFit.autoFit };
}

export function setShownPageTarget(pageTarget: number | null) {
  setPageTarget(activeVersion()?.id ?? null, pageTarget);
}

export function setShownAutoFit(autoFit: boolean) {
  setAutoFit(activeVersion()?.id ?? null, autoFit);
}

/**
 * What the preview draws and the fit measures for the open tab: the resume as the export prints
 * it. A resume with no name yet shows a placeholder, which the export never prints because it asks
 * for a name first.
 */
export function shownFitInput(): FitInput {
  const version = activeVersion();
  const resume = normalizeResume(resolveVersion(currentDocument(), version?.id ?? null));
  if (!resume.basics.name) resume.basics.name = "Your Name";
  return {
    resume,
    template: currentTemplate(),
    accentColor: selectedAccentColor(),
    sectionOrder: version?.sectionOrder,
    ...shownPageFit(),
  };
}

/** The tab a fit belongs to: a version id, or the master. */
const tabKey = () => activeVersion()?.id ?? "master";

const [fits, setFits] = createSignal<ReadonlyMap<string, FitResult>>(new Map());

/**
 * The last fit measured for the open tab. While the user types it can lag the text by a moment;
 * it never belongs to another tab.
 */
export function shownFit(): FitResult | undefined {
  return fits().get(tabKey());
}

/**
 * Measures the open tab whenever it changes: at once on a new tab, otherwise once typing pauses.
 * A measure that a newer change overtakes is dropped. Call once, from the editor.
 */
export function createFitTracker() {
  const input = createMemo(
    () => {
      const value = shownFitInput();
      return { key: tabKey(), value, json: JSON.stringify(value) };
    },
    undefined,
    { equals: (a, b) => a.key === b.key && a.json === b.json }
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  createEffect(
    on(input, (current, previous) => {
      clearTimeout(timer);
      const run = ++latest;
      const measure = async () => {
        try {
          const result = await fitResume(current.value, measurePages);
          if (run !== latest) return;
          setFits((map) => new Map(map).set(current.key, result));
        } catch {
          // Without a measure the preview shows the page untightened and the count stays hidden.
          // The export reports its own error if pdfmake can't run.
        }
      };
      timer = setTimeout(measure, previous?.key === current.key ? FIT_DEBOUNCE_MS : 0);
    })
  );

  onCleanup(() => {
    clearTimeout(timer);
    latest += 1;
  });
}
