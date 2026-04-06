export type PdfFontId = "helvetica";

export interface PdfMakeFontRuntime {
  addFontContainer: (container: PdfMakeFontContainer) => void;
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
}

export interface PdfMakeFontContainer {
  fonts: Record<string, object>;
  vfs: Record<string, string>;
}

export interface PdfFontConfig {
  family: string;
  id: PdfFontId;
  label: string;
  register: (pdfMake: PdfMakeFontRuntime) => Promise<void>;
}

export const DEFAULT_PDF_FONT: PdfFontId = "helvetica";

const loadHelveticaContainer = async (): Promise<PdfMakeFontContainer> => {
  const helveticaModule = await import("pdfmake/build/standard-fonts/Helvetica");
  return helveticaModule.default;
};

export const PDF_FONTS: Record<PdfFontId, PdfFontConfig> = {
  helvetica: {
    id: "helvetica",
    label: "Helvetica",
    family: "Helvetica",
    register: async (pdfMake) => {
      const helvetica = await loadHelveticaContainer();
      pdfMake.addFontContainer(helvetica);
    },
  },
};

export function getPdfFont(fontId: PdfFontId = DEFAULT_PDF_FONT): PdfFontConfig {
  return PDF_FONTS[fontId];
}
