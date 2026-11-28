import type { ResumeSchema } from "@tailory/core";

import type { ProfileSection } from "../../server/profile-page";

// The profile form, described as data: every section of the resume model, its fields, and how to
// name an entry. The form in ProfileForm.tsx renders these.

/** `list` fields hold a list of short strings, typed as one comma-separated line. */
export type FieldKind = "text" | "textarea" | "list" | "url" | "email" | "tel";

export type FieldSpec = {
  key: string;
  label: string;
  kind?: FieldKind;
  hint?: string;
  /** Takes the full width of the entry. Textareas and lists always do. */
  wide?: boolean;
};

export type SectionSpec = {
  key: ProfileSection;
  title: string;
  /** One entry, in "Add job" and "Remove job". */
  noun: string;
  fields: FieldSpec[];
  /** Entries have bullets. */
  highlights?: boolean;
  /** The fields that name an entry in its collapsed heading, joined with " · ". */
  heading: string[];
  /** Date fields shown beside the heading. */
  dates?: [string] | [string, string];
};

const DATE_HINT = "Such as Mar 2021, 2021, or Present";

const start = { key: "startDate", label: "Start", hint: DATE_HINT };
const end = { key: "endDate", label: "End", hint: DATE_HINT };
const url = { key: "url", label: "Link", kind: "url" } as const;
const summary = { key: "summary", label: "Summary", kind: "textarea" } as const;

export const SECTIONS: SectionSpec[] = [
  {
    key: "work",
    title: "Work",
    noun: "job",
    fields: [
      { key: "position", label: "Role" },
      { key: "name", label: "Company" },
      start,
      end,
      url,
      summary,
    ],
    highlights: true,
    heading: ["position", "name"],
    dates: ["startDate", "endDate"],
  },
  {
    key: "education",
    title: "Education",
    noun: "school",
    fields: [
      { key: "institution", label: "School" },
      { key: "studyType", label: "Degree", hint: "Such as BSc or Diploma" },
      { key: "area", label: "Field of study" },
      { key: "score", label: "Grade" },
      start,
      end,
      url,
      { key: "courses", label: "Courses", kind: "list", hint: "Separate with commas" },
    ],
    heading: ["studyType", "area", "institution"],
    dates: ["startDate", "endDate"],
  },
  {
    key: "projects",
    title: "Projects",
    noun: "project",
    fields: [
      { key: "name", label: "Name" },
      { key: "entity", label: "For", hint: "A company or group, if any" },
      start,
      end,
      url,
      { key: "type", label: "Type", hint: "Such as Open source or Talk" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "roles", label: "Your roles", kind: "list", hint: "Separate with commas" },
      { key: "keywords", label: "Keywords", kind: "list", hint: "Separate with commas" },
    ],
    highlights: true,
    heading: ["name", "entity"],
    dates: ["startDate", "endDate"],
  },
  {
    key: "skills",
    title: "Skills",
    noun: "skill group",
    fields: [
      { key: "name", label: "Group", hint: "Such as Languages or Cloud" },
      { key: "level", label: "Level" },
      { key: "keywords", label: "Skills", kind: "list", hint: "Separate with commas" },
    ],
    heading: ["name"],
  },
  {
    key: "volunteer",
    title: "Volunteering",
    noun: "volunteer role",
    fields: [
      { key: "position", label: "Role" },
      { key: "organization", label: "Organization" },
      start,
      end,
      url,
      summary,
    ],
    highlights: true,
    heading: ["position", "organization"],
    dates: ["startDate", "endDate"],
  },
  {
    key: "certificates",
    title: "Certificates",
    noun: "certificate",
    fields: [
      { key: "name", label: "Name" },
      { key: "issuer", label: "Issuer" },
      { key: "date", label: "Date", hint: DATE_HINT },
      url,
    ],
    heading: ["name", "issuer"],
    dates: ["date"],
  },
  {
    key: "awards",
    title: "Awards",
    noun: "award",
    fields: [
      { key: "title", label: "Title" },
      { key: "awarder", label: "Awarded by" },
      { key: "date", label: "Date", hint: DATE_HINT },
      summary,
    ],
    heading: ["title", "awarder"],
    dates: ["date"],
  },
  {
    key: "publications",
    title: "Publications",
    noun: "publication",
    fields: [
      { key: "name", label: "Title" },
      { key: "publisher", label: "Publisher" },
      { key: "releaseDate", label: "Date", hint: DATE_HINT },
      url,
      summary,
    ],
    heading: ["name", "publisher"],
    dates: ["releaseDate"],
  },
  {
    key: "languages",
    title: "Languages",
    noun: "language",
    fields: [
      { key: "language", label: "Language" },
      { key: "fluency", label: "Fluency", hint: "Such as Native or Professional" },
    ],
    heading: ["language", "fluency"],
  },
  {
    key: "interests",
    title: "Interests",
    noun: "interest",
    fields: [
      { key: "name", label: "Interest" },
      { key: "keywords", label: "Details", kind: "list", hint: "Separate with commas" },
    ],
    heading: ["name"],
  },
  {
    key: "references",
    title: "References",
    noun: "reference",
    fields: [
      { key: "name", label: "Name" },
      { key: "reference", label: "Reference", kind: "textarea" },
    ],
    heading: ["name"],
  },
];

/** A section entry, read generically: every entry has an id, some have bullets. */
export type Entry = {
  id: string;
  highlights?: { id: string; text: string }[];
  [field: string]: unknown;
};

/** The entries of `section`, made an array when the resume has none. */
export const entriesOf = (resume: ResumeSchema, section: ProfileSection): Entry[] =>
  (resume[section] ??= []) as unknown as Entry[];

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** What an entry is called in its heading, such as "Engineer · Acme". */
export const entryHeading = (spec: SectionSpec, entry: Entry) =>
  spec.heading
    .map((key) => text(entry[key]))
    .filter(Boolean)
    .join(" · ");

/** An entry's dates for its heading, such as "Mar 2021 – Present". */
export const entryDates = (spec: SectionSpec, entry: Entry) => {
  const [from, to] = (spec.dates ?? []).map((key) => text(entry[key]));
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
};

/** A blank entry for `spec`, with a new id. */
export const blankEntry = (spec: SectionSpec, id: string): Entry => {
  const entry: Entry = { id };
  for (const field of spec.fields) entry[field.key] = field.kind === "list" ? [] : "";
  if (spec.highlights) entry.highlights = [];
  return entry;
};

/** Moves item `from` to `to` in place. */
export const move = <T>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length || from === to) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item as T);
};

/** A comma-separated line as a list, blanks dropped. */
export const parseList = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
