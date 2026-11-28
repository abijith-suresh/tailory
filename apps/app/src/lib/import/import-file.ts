import type { ResumeSchema } from "@tailory/core";

import {
  type SupportedUploadExtension,
  validateUploadFile,
  validateUploadFileContent,
} from "./guardrails";

// Reads a resume file in the browser: the file never leaves it. JSON Resume files go through
// core's JSON import; PDF and DOCX files are turned into text here and read by core's text parser,
// which is best effort. Ported from the site's editor (apps/site/src/lib/upload).

/** What reading a file found, for the review step before it replaces the profile. */
export type ImportPreview = {
  fileName: string;
  kind: SupportedUploadExtension;
  resume: ResumeSchema;
  /** The text parser's confidence, 0 to 100. PDF and DOCX only. */
  confidence?: number;
  /** Top-level JSON fields Tailory doesn't keep. JSON only. */
  ignoredFields: string[];
};

export type ImportOutcome = { ok: true; preview: ImportPreview } | { ok: false; error: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Checks, extracts and parses `file`. Never throws: failures come back as a message. */
export async function readResumeFile(file: File): Promise<ImportOutcome> {
  const checked = validateUploadFile(file);
  if (!checked.ok) return checked;
  const kind = checked.extension;
  const content = await validateUploadFileContent(file, kind);
  if (!content.ok) return content;

  if (kind === "json") {
    try {
      const { parseJsonResumeImport } = await import("@tailory/core");
      const { resume, ignoredFields } = parseJsonResumeImport(await file.text());
      return { ok: true, preview: { fileName: file.name, kind, resume, ignoredFields } };
    } catch (error) {
      return { ok: false, error: message(error, "Couldn't read this JSON Resume file.") };
    }
  }

  try {
    const text =
      kind === "pdf"
        ? await (await import("./pdf")).extractTextFromPDF(file)
        : await (await import("./docx")).extractTextFromDOCX(file);
    const { parseResume } = await import("@tailory/core/parser");
    const { data, confidence } = await parseResume(text);
    return {
      ok: true,
      preview: { fileName: file.name, kind, resume: data, confidence, ignoredFields: [] },
    };
  } catch (error) {
    return { ok: false, error: message(error, "Couldn't read this file. Try another one.") };
  }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** One line per thing found, such as "3 jobs", in the order a resume reads. Empty sections left out. */
export function describeFound(resume: ResumeSchema): string[] {
  const counts: [number, string, string][] = [
    [resume.work?.length ?? 0, "job", "jobs"],
    [resume.education?.length ?? 0, "school", "schools"],
    [resume.projects?.length ?? 0, "project", "projects"],
    [resume.skills?.length ?? 0, "skill group", "skill groups"],
    [resume.volunteer?.length ?? 0, "volunteer role", "volunteer roles"],
    [resume.certificates?.length ?? 0, "certificate", "certificates"],
    [resume.awards?.length ?? 0, "award", "awards"],
    [resume.publications?.length ?? 0, "publication", "publications"],
    [resume.languages?.length ?? 0, "language", "languages"],
    [resume.interests?.length ?? 0, "interest", "interests"],
    [resume.references?.length ?? 0, "reference", "references"],
  ];
  const bullets = [...(resume.work ?? []), ...(resume.volunteer ?? []), ...(resume.projects ?? [])]
    .map((entry) => entry.highlights?.length ?? 0)
    .reduce((sum, count) => sum + count, 0);
  const lines = counts
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => plural(count, one, many));
  if (bullets > 0) lines.push(plural(bullets, "bullet", "bullets"));
  return lines;
}
