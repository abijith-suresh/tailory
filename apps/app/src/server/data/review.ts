import {
  type Application,
  CONTACT_KEYS,
  contactProfileKey,
  ENTRY_SECTIONS,
  findRewording,
  indexProfileItems,
  type ResumeSchema,
  type ResumeSectionKey,
  readProfileText,
  SUMMARY_KEY,
} from "@tailory/core";

// What one change to an application did to the printed page, line by line, so the web app can
// mark an agent's edits where they sit until the user keeps or undoes them.

/** A line the change reworded: what printed before and what prints after. */
export type RewordedLine = {
  itemId: string;
  field: string;
  oldText: string;
  newText: string;
};

/**
 * An entry, bullet, contact detail or the summary the change left out. `afterId` is the item just
 * before it on the page, for placing a mark in the margin: the bullet before a bullet (or its
 * entry, for the first), the entry before an entry, the contact detail before a contact detail.
 * Null when it was first in its section.
 */
export type LeftOutItem = {
  id: string;
  section: ResumeSectionKey | "basics";
  afterId: string | null;
};

export type LineEffects = {
  reworded: RewordedLine[];
  leftOut: LeftOutItem[];
  /** Ids the change put back. */
  putBack: string[];
};

type Placed = { section: ResumeSectionKey | "basics"; afterId: string | null };

/** Where every excludable item sits in the profile: its section and the item before it. */
const placeItems = (profile: ResumeSchema): Map<string, Placed> => {
  const placed = new Map<string, Placed>();
  const contacts = [
    ...Object.values(CONTACT_KEYS),
    ...(profile.basics.profiles ?? []).map((link) => contactProfileKey(link.id)),
  ];
  contacts.forEach((key, index) => {
    placed.set(key, { section: "basics", afterId: contacts[index - 1] ?? null });
  });
  placed.set(SUMMARY_KEY, { section: "summary", afterId: null });
  for (const section of ENTRY_SECTIONS) {
    const entries = (profile[section] ?? []) as {
      id: string;
      highlights?: { id: string }[];
    }[];
    entries.forEach((entry, index) => {
      placed.set(entry.id, { section, afterId: entries[index - 1]?.id ?? null });
      (entry.highlights ?? []).forEach((bullet, at) => {
        placed.set(bullet.id, { section, afterId: entry.highlights?.[at - 1]?.id ?? entry.id });
      });
    });
  }
  return placed;
};

/** The text an application prints for one field: its own wording, or the profile's. */
const printedText = (
  application: Pick<Application, "rewordings">,
  items: ReturnType<typeof indexProfileItems>,
  itemId: string,
  field: string
) => findRewording(application, itemId, field)?.text ?? readProfileText(items, itemId, field);

const rewordingKey = (itemId: string, field: string) => `${itemId}\u0000${field}`;

/**
 * What a change from `before` to `after` did to the page, read against the current profile.
 * Items the profile no longer has are left out of the answer.
 */
export const lineEffects = (
  before: Application,
  after: Application,
  profile: ResumeSchema
): LineEffects => {
  const items = indexProfileItems(profile);
  const placed = placeItems(profile);

  const keys = new Map<string, { itemId: string; field: string }>();
  for (const { itemId, field } of [...before.rewordings, ...after.rewordings]) {
    keys.set(rewordingKey(itemId, field), { itemId, field });
  }
  const reworded: RewordedLine[] = [];
  for (const { itemId, field } of keys.values()) {
    const oldText = printedText(before, items, itemId, field);
    const newText = printedText(after, items, itemId, field);
    if (oldText === null || newText === null || oldText === newText) continue;
    reworded.push({ itemId, field, oldText, newText });
  }

  const was = new Set(before.excluded);
  const now = new Set(after.excluded);
  const leftOut: LeftOutItem[] = [];
  for (const id of after.excluded) {
    const place = placed.get(id);
    if (!was.has(id) && place) leftOut.push({ id, ...place });
  }
  const putBack = before.excluded.filter((id) => !now.has(id) && placed.has(id));
  return { reworded, leftOut, putBack };
};

export const hasLineEffects = (effects: LineEffects) =>
  effects.reworded.length + effects.leftOut.length + effects.putBack.length > 0;

/**
 * The effects `current` still shows: a line reworded since, or an item put back or left out
 * again, no longer shows the change.
 */
export const effectsStillShowing = (
  effects: LineEffects,
  current: Application,
  profile: ResumeSchema
): LineEffects => {
  const items = indexProfileItems(profile);
  const excluded = new Set(current.excluded);
  return {
    reworded: effects.reworded.filter(
      (line) => printedText(current, items, line.itemId, line.field) === line.newText
    ),
    leftOut: effects.leftOut.filter((item) => excluded.has(item.id)),
    putBack: effects.putBack.filter((id) => !excluded.has(id)),
  };
};
