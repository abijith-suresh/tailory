import type { Application } from "../types/application.ts";
import type { ResumeHighlight, ResumeSchema } from "../types/resume.ts";
import { ENTRY_SECTIONS, type EntrySection } from "./items.ts";

export interface KeptCount {
  kept: number;
  total: number;
}

type Entry = { id: string; highlights?: ResumeHighlight[] };

function entriesOf(profile: ResumeSchema, section: EntrySection): Entry[] {
  return (profile[section] ?? []) as Entry[];
}

/** Entries in a section, and how many of them the application keeps. */
export function countSection(
  profile: ResumeSchema,
  application: Pick<Application, "excluded"> | undefined,
  section: EntrySection
): KeptCount {
  const entries = entriesOf(profile, section);
  const excluded = new Set(application?.excluded ?? []);
  return {
    kept: entries.filter((entry) => !excluded.has(entry.id)).length,
    total: entries.length,
  };
}

/**
 * Entries and bullets in the whole profile, and how many the application keeps. A bullet under a
 * left-out entry is not kept.
 */
export function countKept(
  profile: ResumeSchema,
  application: Pick<Application, "excluded">
): KeptCount {
  const excluded = new Set(application.excluded);
  let kept = 0;
  let total = 0;

  for (const section of ENTRY_SECTIONS) {
    for (const entry of entriesOf(profile, section)) {
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
