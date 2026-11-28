// Test-only helpers: fixed profiles and applications, long resumes for page fit, and pdfmake
// loaded with the fonts the templates use, the way the export and a Node measurer load it.

import { PDF_FONT_FAMILY } from "../export/pdf-renderer.ts";
import type { PdfLayoutRuntime } from "../fit/measure.ts";
import { normalizeResume } from "../resume/normalize.ts";
import { type Application, RESUME_SECTION_KEYS } from "../types/application.ts";
import {
  EMPTY_RESUME,
  type ResumeHighlight,
  type ResumeSchema,
  type ResumeWork,
} from "../types/resume.ts";

/** A profile with fixed ids: two jobs with bullets, a project with a bullet, and a skill. */
export function sampleProfile(): ResumeSchema {
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

export function sampleApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "application-acme",
    company: "Acme",
    role: "Staff designer",
    postingUrl: "https://acme.example/jobs/staff-designer",
    jobDescription: "Lead design for scheduling.",
    status: "drafting",
    outcome: null,
    offer: false,
    archived: false,
    createdAt: "2026-11-01T09:00:00.000Z",
    statusChangedAt: "2026-11-01T09:00:00.000Z",
    appliedAt: null,
    closedAt: null,
    notes: "",
    excluded: [],
    rewordings: [],
    sectionOrder: [...RESUME_SECTION_KEYS],
    templateId: "minimal",
    pageTarget: 1,
    autoFit: true,
    ...overrides,
  };
}

/** A work entry of a sample profile, for tests that edit it. */
export function job(profile: ResumeSchema, index: number): ResumeWork {
  const entry = profile.work?.[index];
  if (!entry) throw new Error(`The sample has no work entry ${index}.`);
  return entry;
}

/** A bullet of a sample work entry, for tests that edit it. */
export function bullet(profile: ResumeSchema, jobIndex: number, index: number): ResumeHighlight {
  const highlight = job(profile, jobIndex).highlights?.[index];
  if (!highlight) throw new Error(`The sample has no bullet ${index} in work entry ${jobIndex}.`);
  return highlight;
}

/** On the Modern template this runs onto a second page, and tightening brings it back to one. */
export function longResume(): ResumeSchema {
  const companies = ["A", "B", "C", "D"];
  return normalizeResume({
    ...structuredClone(EMPTY_RESUME),
    basics: {
      name: "Ada Fixture",
      label: "Software Engineer",
      email: "ada.fixture@example.com",
      phone: "+1 555-010-0199",
      summary:
        "Builds small, reliable tools that run in the browser. Cares about clear writing, fast pages and privacy.",
    },
    work: companies.map((company, index) => ({
      id: `work-${company}`,
      name: `Company ${company}`,
      position: "Senior Software Engineer",
      startDate: `${2016 + index * 2}-01`,
      endDate: `${2017 + index * 2}-12`,
      highlights: [1, 2, 3, 4, 5].map((item) => ({
        id: `bullet-${company}${item}`,
        text: `Led work item ${item} at Company ${company}, shipping a faster editor and a calmer review process for the team.`,
      })),
    })),
    education: [
      {
        id: "education-1",
        institution: "Example University",
        area: "Computer Science",
        studyType: "BSc",
        startDate: "2012-09",
        endDate: "2016-06",
      },
    ],
    skills: [
      { id: "skill-1", name: "Languages", keywords: ["TypeScript", "Rust", "Go"] },
      { id: "skill-2", name: "Tools", keywords: ["Solid", "Astro", "Playwright"] },
    ],
  });
}

/** The long resume with each job repeated, too long for one page at any tightening. */
export function veryLongResume(): ResumeSchema {
  const resume = longResume();
  resume.work = [...(resume.work ?? []), ...(resume.work ?? [])].map((entry, index) => ({
    ...entry,
    id: `${entry.id}-${index}`,
  }));
  return resume;
}

/** Counts the pages of a PDF file. */
export function countPdfPages(pdf: Uint8Array): number {
  return new TextDecoder("latin1").decode(pdf).match(/\/Type \/Page\b/g)?.length ?? 0;
}

export interface TestPdfMake extends PdfLayoutRuntime {
  createPdf: (doc: Parameters<PdfLayoutRuntime["createPdf"]>[0]) => {
    getBuffer: () => Promise<Uint8Array>;
  };
}

let runtime: Promise<TestPdfMake> | null = null;

/** pdfmake with Roboto registered, as the export prints with. */
export function loadTestPdfMake(): Promise<TestPdfMake> {
  runtime ??= (async () => {
    const [pdfMakeModule, vfsModule] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as unknown as TestPdfMake & {
      addVirtualFileSystem: (vfs: unknown) => void;
      addFonts: (fonts: Record<string, object>) => void;
    };
    pdfMake.addVirtualFileSystem(vfsModule.default ?? vfsModule);
    pdfMake.addFonts({
      [PDF_FONT_FAMILY]: {
        normal: "Roboto-Regular.ttf",
        bold: "Roboto-Medium.ttf",
        italics: "Roboto-Italic.ttf",
        bolditalics: "Roboto-MediumItalic.ttf",
      },
    });
    return pdfMake;
  })();
  return runtime;
}
