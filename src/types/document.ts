import type { ResumeSchema } from "@/types/resume";
import type { TemplateId } from "@/types/template";

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
 * A version's own wording for one text field. `itemId` is an entry id, a bullet id, or
 * `"basics"` for the fields under the name. `baseText` is the master text when the rewording was
 * made, so a later change to the master can be noticed.
 */
export interface Rewording {
  itemId: string;
  field: string;
  text: string;
  baseText: string;
}

/** The resume cut for one job: which items it leaves out, how it words them, and how it prints. */
export interface ResumeVersion {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  /** Ids of left-out entries and bullets. */
  excluded: string[];
  sectionOrder: ResumeSectionKey[];
  templateId: TemplateId;
  /** Pages the version should fit on, or null for no target. */
  pageTarget: number | null;
  rewordings: Rewording[];
}

/** One resume: the master with everything in it, and a version per job. */
export interface ResumeDocument {
  master: ResumeSchema;
  versions: ResumeVersion[];
}
