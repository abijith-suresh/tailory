declare module "pdfmake/build/standard-fonts/Helvetica" {
  interface PdfMakeFontContainer {
    fonts: Record<string, object>;
    vfs: Record<string, string>;
  }

  const fontContainer: PdfMakeFontContainer;
  export default fontContainer;
}
