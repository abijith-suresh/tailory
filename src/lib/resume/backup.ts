import { JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELDS } from "@/lib/resume/json";
import { normalizeDocument } from "@/lib/versions/document";
import type { ResumeDocument } from "@/types/document";

/**
 * A Tailory backup keeps the master resume and every version in one JSON file:
 *
 *     { "format": "tailory-backup", "version": 1, "resume": { "master": …, "versions": [ … ] } }
 *
 * The master keeps Tailory's ids, so versions still point at the right entries and bullets, and
 * its dates are not converted to JSON Resume's ISO form. A plain JSON Resume file has no `format`
 * field.
 */
export const BACKUP_FORMAT = "tailory-backup";
export const BACKUP_VERSION = 1;

export interface TailoryBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  resume: ResumeDocument;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTailoryBackup(value: unknown): boolean {
  return isRecord(value) && value.format === BACKUP_FORMAT;
}

export function exportBackupDocument(document: ResumeDocument): TailoryBackup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, resume: normalizeDocument(document) };
}

export function exportBackupString(document: ResumeDocument): string {
  return JSON.stringify(exportBackupDocument(document), null, 2);
}

/** Reads a parsed backup file back into a document. Throws a message for the user if it can't. */
export function parseBackupDocument(value: unknown): ResumeDocument {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
    throw new Error("This file isn't a Tailory backup.");
  }

  if (value.version !== BACKUP_VERSION) {
    throw new Error(
      typeof value.version === "number" && value.version > BACKUP_VERSION
        ? "This backup comes from a newer Tailory. Reload the page and try again."
        : "This Tailory backup has a version Tailory can't read."
    );
  }

  const resume = value.resume;
  if (!isRecord(resume) || !isRecord(resume.master)) {
    throw new Error("This Tailory backup has no resume in it.");
  }

  const master = Object.fromEntries(
    JSON_RESUME_SUPPORTED_TOP_LEVEL_FIELDS.filter((key) => key in (resume.master as object)).map(
      (key) => [key, (resume.master as Record<string, unknown>)[key]]
    )
  );

  return normalizeDocument({ master, versions: resume.versions });
}
