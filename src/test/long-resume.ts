import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseJsonResumeImport } from "@/lib/resume/json";
import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeSchema } from "@/types/resume";

/**
 * The e2e long fixture: on the Modern template it runs onto a second page, and tightening brings
 * it back to one.
 */
export function longResume(): ResumeSchema {
  const path = join(process.cwd(), "tests/e2e/fixtures/resume-long.json");
  return normalizeResume(parseJsonResumeImport(readFileSync(path, "utf8")).resume);
}

/** The long fixture with each job's bullets repeated, too long for one page at any tightening. */
export function veryLongResume(): ResumeSchema {
  const resume = longResume();
  resume.work = [...(resume.work ?? []), ...(resume.work ?? [])].map((job, index) => ({
    ...job,
    id: `${job.id}-${index}`,
  }));
  return resume;
}

/** Counts the pages of a PDF file. */
export function countPdfPages(pdf: Uint8Array): number {
  return new TextDecoder("latin1").decode(pdf).match(/\/Type \/Page\b/g)?.length ?? 0;
}
