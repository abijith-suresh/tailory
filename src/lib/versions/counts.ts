import type { ResumeVersion } from "@/types/document";
import type { ResumeHighlight, ResumeSchema } from "@/types/resume";
import { ENTRY_SECTIONS, type EntrySection } from "./items";

export interface KeptCount {
  kept: number;
  total: number;
}

type Entry = { id: string; highlights?: ResumeHighlight[] };

function entriesOf(master: ResumeSchema, section: EntrySection): Entry[] {
  return (master[section] ?? []) as Entry[];
}

/** Entries in a section, and how many of them the version keeps. */
export function countSection(
  master: ResumeSchema,
  version: Pick<ResumeVersion, "excluded"> | undefined,
  section: EntrySection
): KeptCount {
  const entries = entriesOf(master, section);
  const excluded = new Set(version?.excluded ?? []);
  return {
    kept: entries.filter((entry) => !excluded.has(entry.id)).length,
    total: entries.length,
  };
}

/**
 * Entries and bullets in the whole resume, and how many the version keeps. A bullet under a
 * left-out entry is not kept.
 */
export function countKept(
  master: ResumeSchema,
  version: Pick<ResumeVersion, "excluded">
): KeptCount {
  const excluded = new Set(version.excluded);
  let kept = 0;
  let total = 0;

  for (const section of ENTRY_SECTIONS) {
    for (const entry of entriesOf(master, section)) {
      const entryKept = !excluded.has(entry.id);
      total += 1;
      if (entryKept) kept += 1;
      for (const highlight of entry.highlights ?? []) {
        total += 1;
        if (entryKept && !excluded.has(highlight.id)) kept += 1;
      }
    }
  }

  return { kept, total };
}
