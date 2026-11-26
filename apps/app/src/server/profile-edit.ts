import {
  ENTRY_SECTIONS,
  type EntrySection,
  indexProfileItems,
  normalizeResume,
  parseJsonResumeDocument,
  type ResumeSchema,
} from "@tailory/core";

// The edits `update_profile` makes, as one pure step: replace the whole profile, merge fields
// into `basics`, add entries and bullets, change entries and bullets by id, and remove them by
// id. The tool writes the result in one transaction, so either every edit lands or none does.

/** An edit the profile can't take, in words an agent can act on. */
export class ProfileEditError extends Error {
  override name = "ProfileEditError";
}

export type ProfileAdd =
  | { section: EntrySection; entry: Record<string, unknown> }
  | { entryId: string; bullet: string };

export type ProfileEdit = {
  /** A whole new profile, JSON Resume shaped. Applied first. */
  replace?: Record<string, unknown>;
  /** Fields merged into `basics`. */
  basics?: Record<string, unknown>;
  add?: ProfileAdd[];
  change?: { id: string; fields: Record<string, unknown> }[];
  remove?: string[];
};

type Entry = { id: string; highlights?: { id: string; text: string }[] } & Record<string, unknown>;

const SECTIONS_WITH_BULLETS = new Set<string>(["work", "volunteer", "projects"]);

const sections = (resume: ResumeSchema) =>
  resume as unknown as Record<EntrySection, Entry[] | undefined>;

/** The entry holding id `id` (the entry itself, or the entry a bullet belongs to). */
const locate = (resume: ResumeSchema, id: string) => {
  for (const section of ENTRY_SECTIONS) {
    const entries = sections(resume)[section] ?? [];
    for (const [index, entry] of entries.entries()) {
      if (entry.id === id) return { section, entries, index, entry, bullet: null };
      const bullet = entry.highlights?.findIndex((highlight) => highlight.id === id) ?? -1;
      if (bullet >= 0) return { section, entries, index, entry, bullet };
    }
  }
  return null;
};

const unknownId = (id: string) =>
  new ProfileEditError(`No profile entry or bullet has id "${id}". Call get_profile for the ids.`);

const RESERVED = new Set(["id", "highlights"]);

/**
 * Applies `edit` to `current` and returns the new profile, normalized so every entry and bullet
 * has an id, and the ids of what it added, in order. Throws ProfileEditError, changing nothing,
 * when an edit names an id the profile doesn't have.
 */
export const editProfile = (
  current: ResumeSchema,
  edit: ProfileEdit
): { resume: ResumeSchema; added: string[] } => {
  let resume = structuredClone(current);
  if (edit.replace) {
    try {
      resume = parseJsonResumeDocument(edit.replace);
    } catch (error) {
      throw new ProfileEditError((error as Error).message);
    }
  }
  if (edit.basics) {
    const { profiles, location, ...fields } = edit.basics;
    resume.basics = {
      ...resume.basics,
      ...fields,
      ...(location && typeof location === "object"
        ? { location: { ...resume.basics.location, ...location } }
        : {}),
      ...(Array.isArray(profiles) ? { profiles } : {}),
    } as ResumeSchema["basics"];
  }

  // Normalize after each step that adds things, so new entries have ids the next step can use.
  resume = normalizeResume(resume);
  const added: string[] = [];
  for (const item of edit.add ?? []) {
    if ("section" in item) {
      const before = new Set(sections(resume)[item.section]?.map((entry) => entry.id));
      const { id: _ignored, ...entry } = item.entry;
      sections(resume)[item.section] = [...(sections(resume)[item.section] ?? []), entry as Entry];
      resume = normalizeResume(resume);
      const fresh = sections(resume)[item.section]?.find((entry) => !before.has(entry.id));
      if (!fresh) {
        throw new ProfileEditError(`The new ${item.section} entry is empty; give it some text.`);
      }
      added.push(fresh.id);
      continue;
    }
    const found = locate(resume, item.entryId);
    if (!found || found.bullet !== null) throw unknownId(item.entryId);
    if (!SECTIONS_WITH_BULLETS.has(found.section)) {
      throw new ProfileEditError(`${found.section} entries have no bullets.`);
    }
    const before = new Set(found.entry.highlights?.map((highlight) => highlight.id));
    found.entry.highlights = [...(found.entry.highlights ?? []), { id: "", text: item.bullet }];
    resume = normalizeResume(resume);
    const fresh = locate(resume, item.entryId)?.entry.highlights?.find((h) => !before.has(h.id));
    if (!fresh) throw new ProfileEditError("A bullet needs some text.");
    added.push(fresh.id);
  }

  for (const { id, fields } of edit.change ?? []) {
    if (id === "basics") throw new ProfileEditError('Change the basics with "basics", not by id.');
    const found = locate(resume, id);
    if (!found) throw unknownId(id);
    const reserved = Object.keys(fields).filter((key) => RESERVED.has(key));
    if (reserved.length) {
      throw new ProfileEditError(
        `Can't change ${reserved.join(" or ")} of "${id}": edit bullets by their own ids, and add them with add.`
      );
    }
    if (found.bullet !== null) {
      const bullet = found.entry.highlights?.[found.bullet];
      if (typeof fields.text !== "string" || Object.keys(fields).length !== 1 || !bullet) {
        throw new ProfileEditError(`"${id}" is a bullet; change it with { "text": "..." }.`);
      }
      bullet.text = fields.text;
    } else {
      found.entries[found.index] = { ...found.entry, ...fields };
    }
  }

  const remove = new Set(edit.remove ?? []);
  for (const id of remove) {
    if (!locate(resume, id)) throw unknownId(id);
  }
  for (const section of ENTRY_SECTIONS) {
    const entries = sections(resume)[section];
    if (!entries) continue;
    sections(resume)[section] = entries
      .filter((entry) => !remove.has(entry.id))
      .map((entry) =>
        entry.highlights
          ? { ...entry, highlights: entry.highlights.filter((h) => !remove.has(h.id)) }
          : entry
      );
  }

  return { resume: normalizeResume(resume), added };
};

/** How many entries and bullets a profile holds, for a short summary. */
export const countItems = (resume: ResumeSchema) => {
  let entries = 0;
  let bullets = 0;
  for (const item of indexProfileItems(resume).values()) {
    if (item.kind === "highlight") bullets += 1;
    else if (item.kind !== "basics") entries += 1;
  }
  return { entries, bullets };
};
