import type { TemplateId } from "./template.ts";

/** The sections of a resume page, in the order the templates print them by default. */
export const RESUME_SECTION_KEYS = [
  "summary",
  "work",
  "volunteer",
  "education",
  "awards",
  "publications",
  "skills",
  "languages",
  "interests",
  "projects",
  "references",
  "certificates",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

/**
 * An application's own wording for one text field. `itemId` is an entry id, a bullet id, or
 * `"basics"` for the fields under the name. `baseText` is the profile text when the rewording was
 * made, so a later change to the profile can be noticed.
 */
export interface Rewording {
  itemId: string;
  field: string;
  text: string;
  baseText: string;
}

/** Where an application stands with the employer. */
export const APPLICATION_STATUSES = [
  "drafting",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** How a resume is fitted to pages. */
export interface PageFit {
  /** Pages the resume should fit on, or null for no target. The user picks it. */
  pageTarget: number | null;
  /** Whether Tailory may tighten spacing and text to meet the page target. */
  autoFit: boolean;
}

/**
 * One job applied for, and the resume cut from the profile for it: which items it leaves out, how
 * it words them, and how it prints. Dates are ISO 8601 strings.
 */
export interface Application extends PageFit {
  id: string;
  company: string;
  role: string;
  postingUrl: string | null;
  jobDescription: string | null;
  status: ApplicationStatus;
  /** Hidden from the main list but kept. */
  archived: boolean;
  createdAt: string;
  appliedAt: string | null;
  closedAt: string | null;
  notes: string;
  /** Ids of profile entries and bullets this application leaves out. */
  excluded: string[];
  rewordings: Rewording[];
  sectionOrder: ResumeSectionKey[];
  templateId: TemplateId;
}
