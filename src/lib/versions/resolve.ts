import { normalizeResume } from "@/lib/resume/normalize";
import type { ResumeDocument, ResumeVersion, Rewording } from "@/types/document";
import type { ResumeHighlight, ResumeSchema } from "@/types/resume";
import {
  BASICS_ITEM_ID,
  ENTRY_SECTIONS,
  type ItemKind,
  indexMasterItems,
  isRewordableField,
  readMasterText,
} from "./items";

type Wording = Map<string, Map<string, string>>;

function wordingByItem(rewordings: readonly Rewording[]): Wording {
  const wording: Wording = new Map();
  for (const { itemId, field, text } of rewordings) {
    const fields = wording.get(itemId) ?? new Map<string, string>();
    fields.set(field, text);
    wording.set(itemId, fields);
  }
  return wording;
}

function reword<T extends object>(item: T, itemId: string, kind: ItemKind, wording: Wording): T {
  const fields = wording.get(itemId);
  if (!fields) return item;

  const reworded = { ...item } as Record<string, unknown>;
  for (const [field, text] of fields) {
    if (isRewordableField(kind, field)) reworded[field] = text;
  }
  return reworded as T;
}

function resolveHighlights(
  highlights: ResumeHighlight[] | undefined,
  excluded: Set<string>,
  wording: Wording
): ResumeHighlight[] | undefined {
  return highlights
    ?.filter((highlight) => !excluded.has(highlight.id))
    .map((highlight) => reword(highlight, highlight.id, "highlight", wording));
}

function resolveWithVersion(master: ResumeSchema, version: ResumeVersion): ResumeSchema {
  const excluded = new Set(version.excluded);
  const wording = wordingByItem(version.rewordings);
  const resolved: Record<string, unknown> = {
    ...master,
    basics: reword(master.basics, BASICS_ITEM_ID, "basics", wording),
  };

  for (const section of ENTRY_SECTIONS) {
    const entries: Array<{ id: string; highlights?: ResumeHighlight[] }> = master[section] ?? [];
    resolved[section] = entries
      .filter((entry) => !excluded.has(entry.id))
      .map((entry) => {
        const reworded = reword(entry, entry.id, section, wording);
        return "highlights" in entry
          ? { ...reworded, highlights: resolveHighlights(entry.highlights, excluded, wording) }
          : reworded;
      });
  }

  return resolved as unknown as ResumeSchema;
}

/**
 * The resume a version prints: the master without the version's left-out entries and bullets,
 * with the version's wording where it has any. A null id gives the master.
 */
export function resolveVersion(document: ResumeDocument, versionId: string | null): ResumeSchema {
  const master = normalizeResume(document.master);
  if (versionId === null) return master;

  const version = document.versions.find((candidate) => candidate.id === versionId);
  if (!version) {
    throw new Error(`There is no version with id "${versionId}".`);
  }

  return resolveWithVersion(master, version);
}

/** Text compared without regard to spacing, so retyping the same words is not a change. */
export function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

/** True when the master text has changed since the version reworded it. */
export function isOriginalChanged(master: ResumeSchema, rewording: Rewording): boolean {
  const current = readMasterText(indexMasterItems(master), rewording.itemId, rewording.field);
  return current !== null && !sameText(current, rewording.baseText);
}

export function findRewording(
  version: ResumeVersion,
  itemId: string,
  field: string
): Rewording | undefined {
  return version.rewordings.find(
    (rewording) => rewording.itemId === itemId && rewording.field === field
  );
}
