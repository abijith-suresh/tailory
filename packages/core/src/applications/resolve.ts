import { normalizeResume } from "../resume/normalize.ts";
import type { Application, Rewording } from "../types/application.ts";
import type { ResumeBasics, ResumeHighlight, ResumeSchema } from "../types/resume.ts";
import {
  BASICS_ITEM_ID,
  CONTACT_KEYS,
  contactProfileKey,
  ENTRY_SECTIONS,
  type ItemKind,
  indexProfileItems,
  isRewordableField,
  type ProfileItem,
  readProfileText,
  SUMMARY_KEY,
} from "./items.ts";

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

/** The basics without the contact details and summary the application leaves out. */
function leaveOutOfBasics(basics: ResumeBasics, excluded: Set<string>): ResumeBasics {
  const kept: ResumeBasics = { ...basics };
  if (excluded.has(CONTACT_KEYS.email)) kept.email = "";
  if (excluded.has(CONTACT_KEYS.phone)) kept.phone = "";
  if (excluded.has(CONTACT_KEYS.url)) kept.url = undefined;
  if (excluded.has(CONTACT_KEYS.location)) kept.location = {};
  if (excluded.has(SUMMARY_KEY)) kept.summary = "";
  kept.profiles = basics.profiles?.filter((link) => !excluded.has(contactProfileKey(link.id)));
  return kept;
}

/** Text compared without regard to spacing, so retyping the same words is not a change. */
export function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

function isStale(items: Map<string, ProfileItem>, rewording: Rewording): boolean {
  const current = readProfileText(items, rewording.itemId, rewording.field);
  return current !== null && !sameText(current, rewording.baseText);
}

/**
 * True when the profile text has changed since the application reworded it. A rewording of an
 * item the profile no longer has is not stale; it no longer prints.
 */
export function isRewordingStale(profile: ResumeSchema, rewording: Rewording): boolean {
  return isStale(indexProfileItems(profile), rewording);
}

export function findRewording(
  application: Pick<Application, "rewordings">,
  itemId: string,
  field: string
): Rewording | undefined {
  return application.rewordings.find(
    (rewording) => rewording.itemId === itemId && rewording.field === field
  );
}

/** An application's resume as it will print, and what in it needs a look. */
export interface ResolvedApplication {
  resume: ResumeSchema;
  /** Rewordings whose profile text has changed since they were made. They still print. */
  staleRewordings: Rewording[];
}

/**
 * The resume an application prints: the profile without the application's left-out entries,
 * bullets, contact details and summary, with the application's wording where it has any. The profile's other edits come
 * through. Neither argument is changed.
 */
export function resolveApplication(
  profile: ResumeSchema,
  application: Pick<Application, "excluded" | "rewordings">
): ResolvedApplication {
  const normalized = normalizeResume(profile);
  const excluded = new Set(application.excluded);
  const wording = wordingByItem(application.rewordings);
  const resume: Record<string, unknown> = {
    ...normalized,
    basics: leaveOutOfBasics(
      reword(normalized.basics, BASICS_ITEM_ID, "basics", wording),
      excluded
    ),
  };

  for (const section of ENTRY_SECTIONS) {
    const entries: Array<{ id: string; highlights?: ResumeHighlight[] }> =
      normalized[section] ?? [];
    resume[section] = entries
      .filter((entry) => !excluded.has(entry.id))
      .map((entry) => {
        const reworded = reword(entry, entry.id, section, wording);
        return "highlights" in entry
          ? { ...reworded, highlights: resolveHighlights(entry.highlights, excluded, wording) }
          : reworded;
      });
  }

  const items = indexProfileItems(normalized);
  return {
    resume: resume as unknown as ResumeSchema,
    staleRewordings: application.rewordings.filter((rewording) => isStale(items, rewording)),
  };
}
