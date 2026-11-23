export const PDF_FONT_FAMILY = "Roboto";

export interface PdfMakeFontRuntime {
  addFonts?: (fonts: Record<string, object>) => void;
  addVirtualFileSystem: (vfs: Record<string, string>) => void;
}

export async function registerPdfFonts(pdfMake: PdfMakeFontRuntime): Promise<void> {
  const vfsFonts = await import("pdfmake/build/vfs_fonts");
  const robotoVfs = (vfsFonts.default ?? vfsFonts) as Record<string, string>;

  pdfMake.addVirtualFileSystem(robotoVfs);
  pdfMake.addFonts?.({
    [PDF_FONT_FAMILY]: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  });
}
