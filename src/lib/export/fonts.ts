export type PdfFontId = "roboto" | "helvetica" | "times";

export interface PdfMakeFontRuntime {
  addFonts?: (fonts: Record<string, object>) => void;
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
}

export interface PdfFontConfig {
  family: string;
  id: PdfFontId;
  label: string;
  previewFontFamily: string;
  register: (pdfMake: PdfMakeFontRuntime) => Promise<void>;
}

export const DEFAULT_PDF_FONT: PdfFontId = "roboto";

export const PDF_FONTS: Record<PdfFontId, PdfFontConfig> = {
  roboto: {
    id: "roboto",
    label: "Roboto",
    family: "Roboto",
    previewFontFamily: '"Roboto", "Geist", Arial, sans-serif',
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
  helvetica: {
    id: "helvetica",
    label: "Helvetica",
    family: "Helvetica",
    previewFontFamily: '"Helvetica Neue", Arial, sans-serif',
    register: async (pdfMake) => {
      pdfMake.addFonts?.({
        Helvetica: {
          normal: "Helvetica",
          bold: "Helvetica-Bold",
          italics: "Helvetica-Oblique",
          bolditalics: "Helvetica-BoldOblique",
        },
      });
    },
  },
  times: {
    id: "times",
    label: "Times New Roman",
    family: "Times",
    previewFontFamily: '"Times New Roman", Georgia, serif',
    register: async (pdfMake) => {
      pdfMake.addFonts?.({
        Times: {
          normal: "Times-Roman",
          bold: "Times-Bold",
          italics: "Times-Italic",
          bolditalics: "Times-BoldItalic",
        },
      });
    },
  },
};

export const PDF_FONT_OPTIONS = Object.values(PDF_FONTS);

export function getPdfFont(fontId: PdfFontId = DEFAULT_PDF_FONT): PdfFontConfig {
  return PDF_FONTS[fontId];
}
