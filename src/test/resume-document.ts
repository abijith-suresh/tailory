import type { ResumeDocument, ResumeVersion } from "@/types/document";
import {
  EMPTY_RESUME,
  type ResumeHighlight,
  type ResumeSchema,
  type ResumeWork,
} from "@/types/resume";

/** A master with fixed ids: two jobs with bullets, a project with a bullet, and a skill. */
export function sampleMaster(): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    basics: {
      ...structuredClone(EMPTY_RESUME.basics),
      name: "Jane Doe",
      label: "Product designer",
      summary: "Designs scheduling tools.",
    },
    work: [
      {
        id: "work-a",
        name: "Fieldnote",
        position: "Senior designer",
        summary: "Leads design.",
        highlights: [
          { id: "bullet-a1", text: "Redesigned scheduling" },
          { id: "bullet-a2", text: "Built the design system" },
        ],
      },
      {
        id: "work-b",
        name: "Northwind",
        position: "Designer",
        highlights: [{ id: "bullet-b1", text: "Ran customer interviews" }],
      },
    ],
    projects: [
      {
        id: "project-a",
        name: "Portfolio",
        description: "Case studies.",
        highlights: [{ id: "bullet-p1", text: "Wrote six case studies" }],
      },
    ],
    skills: [{ id: "skill-a", name: "Figma", keywords: [] }],
  };
}

export function sampleVersion(overrides: Partial<ResumeVersion> = {}): ResumeVersion {
  return {
    id: "version-acme",
    name: "Acme",
    jobTitle: "Staff designer",
    company: "Acme",
    excluded: [],
    sectionOrder: [
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
    ],
    templateId: "minimal",
    pageTarget: 1,
    autoFit: true,
    rewordings: [],
    ...overrides,
  };
}

export function sampleDocument(versions: ResumeVersion[] = [sampleVersion()]): ResumeDocument {
  return { master: sampleMaster(), versions };
}

/** A work entry of a sample master, for tests that edit it. */
export function job(master: ResumeSchema, index: number): ResumeWork {
  const entry = master.work?.[index];
  if (!entry) throw new Error(`The sample has no work entry ${index}.`);
  return entry;
}

/** A bullet of a sample work entry, for tests that edit it. */
export function bullet(master: ResumeSchema, jobIndex: number, index: number): ResumeHighlight {
  const highlight = job(master, jobIndex).highlights?.[index];
  if (!highlight) throw new Error(`The sample has no bullet ${index} in work entry ${jobIndex}.`);
  return highlight;
}
