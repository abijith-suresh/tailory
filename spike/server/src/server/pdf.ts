import { createRequire } from "node:module";
import path from "node:path";

// Reuse Tailory's existing, browser-tested document builder unchanged.
import { modernTemplate } from "@/lib/templates/modern";
import { createSampleResume } from "@/lib/templates/sample-resume";
import type { ResumeSchema } from "@/types/resume";

const require = createRequire(import.meta.url);

type PdfMake = {
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  setLocalAccessPolicy: (cb: (p: string) => boolean) => void;
  setUrlAccessPolicy?: (cb: (u: string) => boolean) => void;
  createPdf: (def: unknown) => { getBuffer: () => Promise<Buffer> };
};

let ready: PdfMake | undefined;
const pdfmake = () => {
  if (ready) return ready;
  const pm = require("pdfmake") as PdfMake;
  // Node entry reads real TTF files from node_modules/pdfmake/fonts/Roboto.
  const roboto = require("pdfmake/fonts/Roboto") as { Roboto: Record<string, string> };
  pm.addFonts(roboto);
  const fontDir = path.dirname(roboto.Roboto.normal);
  // Default policy is "read any local path". Content comes from agents, so
  // lock file reads to the font directory.
  pm.setLocalAccessPolicy((p) => path.resolve(p).startsWith(fontDir + path.sep));
  pm.setUrlAccessPolicy?.(() => false);
  ready = pm;
  return pm;
};

export async function renderResumePdf(resume: ResumeSchema = createSampleResume()) {
  const started = performance.now();
  const buffer = await pdfmake().createPdf(modernTemplate(resume)).getBuffer();
  return { buffer, ms: Math.round(performance.now() - started) };
}
