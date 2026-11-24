import { loadPdfMake } from "@/lib/export/pdfmake-runtime";
import { createPageMeasurer } from "./measure";

/** Measures pages with the pdfmake the export uses. */
export const measurePages = createPageMeasurer(loadPdfMake);
