// pdf.js, loaded on first use by the screens that draw PDFs: the Application preview and the
// board's thumbnails. One worker serves every drawing; a task destroyed after drawing leaves a
// shared worker running.

type PdfJs = typeof import("pdfjs-dist");

let pdfjs: Promise<{ module: PdfJs; worker: InstanceType<PdfJs["PDFWorker"]> }> | null = null;

export const loadPdfJs = () => {
  pdfjs ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([module, worker]) => {
    module.GlobalWorkerOptions.workerSrc = worker.default;
    return { module, worker: new module.PDFWorker() };
  });
  return pdfjs;
};

export const decodeBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

/**
 * Draws pages of a base64 PDF, each to its own canvas, `scale` device pixels per point. `limit`
 * stops after that many pages.
 */
export async function drawPdfPages(
  pdf: string,
  scale: number,
  limit = Number.POSITIVE_INFINITY
): Promise<HTMLCanvasElement[]> {
  const { module, worker } = await loadPdfJs();
  const task = module.getDocument({ data: decodeBase64(pdf), worker });
  const document = await task.promise;
  try {
    const canvases: HTMLCanvasElement[] = [];
    for (let number = 1; number <= Math.min(document.numPages, limit); number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale });
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
}
