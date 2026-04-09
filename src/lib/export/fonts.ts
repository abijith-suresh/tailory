export type PdfFontId = "roboto";

export interface PdfMakeFontRuntime {
  addFonts?: (fonts: Record<string, object>) => void;
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
}

export interface PdfFontConfig {
  family: string;
  id: PdfFontId;
  label: string;
  register: (pdfMake: PdfMakeFontRuntime) => Promise<void>;
}

export const DEFAULT_PDF_FONT: PdfFontId = "roboto";

export const PDF_FONTS: Record<PdfFontId, PdfFontConfig> = {
  roboto: {
    id: "roboto",
    label: "Roboto",
    family: "Roboto",
    register: async (pdfMake) => {
      const vfsFonts = await import("pdfmake/build/vfs_fonts");
      const robotoVfs = (vfsFonts.default ?? vfsFonts) as Record<string, string>;

      pdfMake.addVirtualFileSystem(robotoVfs);
      pdfMake.addFonts?.({
        Roboto: {
          normal: "Roboto-Regular.ttf",
          bold: "Roboto-Medium.ttf",
          italics: "Roboto-Italic.ttf",
          bolditalics: "Roboto-MediumItalic.ttf",
        },
      });
    },
  },
};

export function getPdfFont(fontId: PdfFontId = DEFAULT_PDF_FONT): PdfFontConfig {
  return PDF_FONTS[fontId];
}
