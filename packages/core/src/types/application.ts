import type { TemplateId } from "./template.ts";

/**
 * The sections of a resume page, in the default order: the order a new profile prints in, and so
 * the order a new application starts from.
 */
export const RESUME_SECTION_KEYS = [
  "summary",
  "work",
  "projects",
  "education",
  "volunteer",
  "awards",
  "certificates",
  "skills",
  "languages",
  "publications",
  "interests",
  "references",
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

/**
 * Where an application stands with the employer, in the order it moves. A board shows one column
 * for each.
 */
export const APPLICATION_STATUSES = ["drafting", "applied", "interviewing", "closed"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** How a closed application ended. Every closed application has one; no other has any. */
export const APPLICATION_OUTCOMES = ["accepted", "declined", "rejected", "withdrawn"] as const;

export type ApplicationOutcome = (typeof APPLICATION_OUTCOMES)[number];

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
  /** How it ended: set when `status` is closed, and null otherwise. */
  outcome: ApplicationOutcome | null;
  /** An offer waiting on the user's answer, usually while interviewing. Never set once closed. */
  offer: boolean;
  /** Hidden from every view unless asked for, but kept. */
  archived: boolean;
  createdAt: string;
  /** When the status or outcome last changed; the creation time until then. */
  statusChangedAt: string;
  appliedAt: string | null;
  closedAt: string | null;
  notes: string;
  /**
   * What this application leaves out of the profile: entry and bullet ids, contact keys
   * (`contact:email`, `contact:phone`, `contact:location`, `contact:url`, and
   * `contact:profile:<link id>`), and `basics:summary` for the summary.
   */
  excluded: string[];
  rewordings: Rewording[];
  /** Every section, first to last. Starts as the profile's order; moves whole sections only. */
  sectionOrder: ResumeSectionKey[];
  templateId: TemplateId;
}
