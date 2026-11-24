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
} from "@/types/resume";

/** The id a rewording uses for the fields under the name (headline, summary, contact details). */
export const BASICS_ITEM_ID = "basics";

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

/** The text fields a version may reword, by kind of item. */
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
};

export type ItemKind = keyof typeof REWORDABLE_FIELDS;

export interface MasterItem {
  kind: ItemKind;
  values: object;
}

export function isRewordableField(kind: ItemKind, field: string): boolean {
  return (REWORDABLE_FIELDS[kind] as readonly string[]).includes(field);
}

/** Every item in the master a version can refer to, by id. */
export function indexMasterItems(master: ResumeSchema): Map<string, MasterItem> {
  const items = new Map<string, MasterItem>([
    [BASICS_ITEM_ID, { kind: "basics", values: master.basics }],
  ]);

  for (const section of ENTRY_SECTIONS) {
    for (const entry of master[section] ?? []) {
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

/** An entry or a bullet can be left out of a version; the fields under the name cannot. */
export function isExcludable(item: MasterItem | undefined): boolean {
  return item !== undefined && item.kind !== "basics";
}

/** The master's text for a field, or null when the item is gone or the field can't be reworded. */
export function readMasterText(
  items: Map<string, MasterItem>,
  itemId: string,
  field: string
): string | null {
  const item = items.get(itemId);
  if (!item || !isRewordableField(item.kind, field)) return null;

  const value = (item.values as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}
