import { isServer } from "@solidjs/web";
import { createEffect, createUniqueId } from "solid-js";

// The preview shows the PDF the server printed, the same file the Download button gives, drawn
// page by page with pdf.js. An embedded PDF viewer would be simpler, but phones don't show PDFs
// in a frame (Android Chrome downloads them), and its toolbar and zoom vary by browser. Drawing
// the pages to canvases works the same everywhere and keeps the previous pages on screen until
// the next ones are ready, so an edit doesn't flash.

type PdfJs = typeof import("pdfjs-dist");

// One worker for every redraw; a task destroyed after drawing leaves a shared worker running.
let pdfjs: Promise<{ module: PdfJs; worker: InstanceType<PdfJs["PDFWorker"]> }> | null = null;

const loadPdfJs = () => {
  pdfjs ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([module, worker]) => {
    module.GlobalWorkerOptions.workerSrc = worker.default;
    return { module, worker: new module.PDFWorker() };
  });
  return pdfjs;
};

const decode = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

// Pages are drawn at 1.5 times their size in points (918 px wide for Letter), twice that on
// high-density screens, and scaled to the column by CSS. Sharp at any width the layout gives.
const scale = () => 1.5 * Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);

/** Draws every page of `pdf` to its own canvas. */
const drawPages = async (pdf: string): Promise<HTMLCanvasElement[]> => {
  const { module, worker } = await loadPdfJs();
  const task = module.getDocument({ data: decode(pdf), worker });
  const document = await task.promise;
  try {
    const canvases: HTMLCanvasElement[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: scale() });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
    }
    return canvases;
  } finally {
    await task.destroy();
  }
};

type PdfPreviewProps = {
  /** The PDF, base64. */
  pdf: string;
  /** Says what the pages are of, for screen readers. */
  label: string;
  /** Dims the pages while a newer version is on its way. */
  stale?: boolean;
};

const pageFrame = (child: Node | string, label?: string) => {
  const frame = window.document.createElement("div");
  frame.className = label ? "pdf-preview__page" : "pdf-preview__page pdf-preview__page--empty";
  if (label) {
    frame.setAttribute("role", "img");
    frame.setAttribute("aria-label", label);
  }
  frame.append(child);
  return frame;
};

export function PdfPreview(props: PdfPreviewProps) {
  // The pages are canvases drawn after hydration, so they go into the frame directly. The frame
  // is found by id when they are ready: under hydration a ref can hand over an element that never
  // reaches the page.
  const id = createUniqueId();
  const frameOf = () => window.document.getElementById(id);

  if (!isServer) {
    let run = 0;
    createEffect(
      () => props.pdf,
      (pdf) => {
        const current = ++run;
        drawPages(pdf).then(
          (canvases) => {
            const frame = frameOf();
            if (current !== run || !frame) return;
            frame.replaceChildren(
              ...canvases.map((canvas, index) =>
                pageFrame(canvas, `Page ${index + 1} of ${canvases.length}`)
              )
            );
          },
          () => {
            const frame = frameOf();
            if (current !== run || !frame) return;
            frame.replaceChildren(
              pageFrame("The preview couldn't be drawn. Download the PDF to see it.")
            );
          }
        );
      }
    );
  }

  return (
    <div
      id={id}
      class={["pdf-preview", { "pdf-preview--stale": Boolean(props.stale) }]}
      role="group"
      aria-label={props.label}
      aria-busy={props.stale ? "true" : "false"}
    >
      <div class="pdf-preview__page pdf-preview__page--empty">Drawing the pages…</div>
    </div>
  );
}
