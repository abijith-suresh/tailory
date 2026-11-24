import { createDocument, normalizeDocument } from "@/lib/versions/document";
import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import type { ResumeDraft } from "./db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads a stored draft in either shape: the current one with a document, or the first one
 * (IndexedDB version 1), whose `resumeData` becomes a document with no versions.
 */
export function readDraftRecord(record: unknown): ResumeDraft {
  const source = isRecord(record) ? record : {};
  const document =
    "document" in source
      ? normalizeDocument(source.document)
      : createDocument(
          (isRecord(source.resumeData) ? source.resumeData : EMPTY_RESUME) as ResumeSchema
        );

  return {
    id: String(source.id),
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Untitled",
    createdAt: typeof source.createdAt === "number" ? source.createdAt : 0,
    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : 0,
    document,
  };
}
