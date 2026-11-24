import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { type PdfMakeFontRuntime, registerPdfFonts } from "./fonts";

export interface PdfMakeDocument {
  getBlob: () => Promise<Blob>;
  getBuffer: () => Promise<Uint8Array>;
}

export interface PdfMakeRuntime {
  createPdf: (docDefinition: TDocumentDefinitions) => PdfMakeDocument;
}

let runtime: Promise<PdfMakeRuntime> | null = null;

/**
 * pdfmake with Tailory's fonts. It is loaded on first use: it reads `window` when imported, and it
 * is large.
 */
export function loadPdfMake(): Promise<PdfMakeRuntime> {
  runtime ??= (async () => {
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfMake = pdfMakeModule.default as unknown as PdfMakeFontRuntime & PdfMakeRuntime;
    await registerPdfFonts(pdfMake);
    return pdfMake;
  })().catch((error) => {
    runtime = null;
    throw error;
  });
  return runtime;
}
