import type {
  ResumeAward,
  ResumeBasics,
  ResumeCertificate,
  ResumeEducation,
  ResumeHighlight,
  ResumeInterest,
  ResumeLanguage,
  ResumeProject,
  ResumePublication,
  ResumeReference,
  ResumeSchema,
  ResumeSkill,
  ResumeVolunteer,
  ResumeWork,
} from "../types/resume.ts";

/** The id a rewording uses for the fields under the name (headline, summary, contact details). */
export const BASICS_ITEM_ID = "basics";

/**
 * Keys an application leaves contact details out by, in its `excluded` list. Each profile link
 * has its own key, `contact:profile:<link id>`, so leaving one out survives reordering the links.
 */
export const CONTACT_KEYS = {
  email: "contact:email",
  phone: "contact:phone",
  location: "contact:location",
  url: "contact:url",
} as const;

export const contactProfileKey = (linkId: string) => `contact:profile:${linkId}`;

/** The key an application leaves the summary out by. */
export const SUMMARY_KEY = "basics:summary";

/** The profile sections made of entries with ids. */
export const ENTRY_SECTIONS = [
  "work",
  "volunteer",
  "education",
  "awards",
  "certificates",
  "publications",
  "skills",
  "languages",
  "interests",
  "references",
  "projects",
] as const satisfies readonly (keyof ResumeSchema)[];

export type EntrySection = (typeof ENTRY_SECTIONS)[number];

type TextField<T> = Exclude<
  { [K in keyof T]-?: NonNullable<T[K]> extends string ? K : never }[keyof T],
  "id"
>;

/** The text fields an application may reword, by kind of item. */
export const REWORDABLE_FIELDS = {
  basics: ["name", "label", "email", "phone", "url", "summary"],
  work: ["name", "position", "url", "startDate", "endDate", "summary"],
  volunteer: ["organization", "position", "url", "startDate", "endDate", "summary"],
  education: ["institution", "url", "area", "studyType", "startDate", "endDate", "score"],
  awards: ["title", "date", "awarder", "summary"],
  certificates: ["name", "date", "issuer", "url"],
  publications: ["name", "publisher", "releaseDate", "url", "summary"],
  skills: ["name", "level"],
  languages: ["language", "fluency"],
  interests: ["name"],
  references: ["name", "reference"],
  projects: ["name", "description", "startDate", "endDate", "url", "entity", "type"],
  highlight: ["text"],
  contact: [],
  summary: [],
} as const satisfies {
  basics: readonly TextField<ResumeBasics>[];
  work: readonly TextField<ResumeWork>[];
  volunteer: readonly TextField<ResumeVolunteer>[];
  education: readonly TextField<ResumeEducation>[];
  awards: readonly TextField<ResumeAward>[];
  certificates: readonly TextField<ResumeCertificate>[];
  publications: readonly TextField<ResumePublication>[];
  skills: readonly TextField<ResumeSkill>[];
  languages: readonly TextField<ResumeLanguage>[];
  interests: readonly TextField<ResumeInterest>[];
  references: readonly TextField<ResumeReference>[];
  projects: readonly TextField<ResumeProject>[];
  highlight: readonly TextField<ResumeHighlight>[];
  contact: readonly never[];
  summary: readonly never[];
};

export type ItemKind = keyof typeof REWORDABLE_FIELDS;

export interface ProfileItem {
  kind: ItemKind;
  values: object;
}

export function isRewordableField(kind: ItemKind, field: string): boolean {
  return (REWORDABLE_FIELDS[kind] as readonly string[]).includes(field);
}

/**
 * Every item in the profile an application can refer to, by id: the basics, each entry and
 * bullet, each contact detail by its key (whether or not it is filled in), and the summary.
 */
export function indexProfileItems(profile: ResumeSchema): Map<string, ProfileItem> {
  const items = new Map<string, ProfileItem>([
    [BASICS_ITEM_ID, { kind: "basics", values: profile.basics }],
    [SUMMARY_KEY, { kind: "summary", values: {} }],
  ]);
  for (const key of Object.values(CONTACT_KEYS)) {
    items.set(key, { kind: "contact", values: {} });
  }
  for (const link of profile.basics.profiles ?? []) {
    if (link.id) items.set(contactProfileKey(link.id), { kind: "contact", values: link });
  }

  for (const section of ENTRY_SECTIONS) {
    for (const entry of profile[section] ?? []) {
      items.set(entry.id, { kind: section, values: entry });
      if ("highlights" in entry) {
        for (const highlight of entry.highlights ?? []) {
          items.set(highlight.id, { kind: "highlight", values: highlight });
        }
      }
    }
  }

  return items;
}

/**
 * An entry, a bullet, a contact detail or the summary can be left out of an application; the
 * name and headline cannot.
 */
export function isExcludable(item: ProfileItem | undefined): boolean {
  return item !== undefined && item.kind !== "basics";
}

/** The profile's text for a field, or null when the item is gone or the field can't be reworded. */
export function readProfileText(
  items: Map<string, ProfileItem>,
  itemId: string,
  field: string
): string | null {
  const item = items.get(itemId);
  if (!item || !isRewordableField(item.kind, field)) return null;

  const value = (item.values as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}
