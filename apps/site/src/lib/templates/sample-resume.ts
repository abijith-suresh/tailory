import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

/**
 * A realistic one-page resume for the marketing site. The home page renders it with the
 * same template code as the editor preview, so what visitors see is real output.
 */
export function createSampleResume(): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    basics: {
      name: "Rosa Delgado",
      label: "Product designer",
      email: "rosa@delgado.design",
      phone: "+1 555 014 2290",
      url: "https://delgado.design",
      summary:
        "Product designer with eight years in B2B software. I turn messy workflows into tools people pick up without training, and I write the specs engineers ask for.",
      location: { city: "Portland", region: "OR", countryCode: "US" },
      profiles: [],
    },
    work: [
      {
        id: "work-1",
        name: "Fieldnote",
        position: "Senior product designer",
        startDate: "Mar 2022",
        endDate: "Present",
        highlights: [
          "Redesigned scheduling for 4,000 field teams; support tickets fell by a third",
          "Built the design system the web and mobile apps now share",
          "Run weekly critique for a team of six designers",
        ],
      },
      {
        id: "work-2",
        name: "Northwind Labs",
        position: "Product designer",
        startDate: "Jun 2018",
        endDate: "Feb 2022",
        highlights: [
          "Led onboarding research and cut time to first report from 3 days to 40 minutes",
          "Shipped billing, roles, and audit log for the enterprise plan",
          "Ran 60+ customer interviews and set up the research repository",
        ],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "Oregon State University",
        studyType: "B.F.A.",
        area: "Graphic Design",
        startDate: "2012",
        endDate: "2016",
      },
    ],
    projects: [
      {
        id: "project-1",
        name: "Plain Forms",
        description:
          "Open-source form patterns for public services, now used by two city websites.",
        url: "https://delgado.design/plain-forms",
      },
    ],
    skills: [
      { id: "skill-1", name: "Design", keywords: ["Figma", "prototyping", "design systems"] },
      { id: "skill-2", name: "Research", keywords: ["interviews", "usability testing"] },
      { id: "skill-3", name: "Build", keywords: ["HTML", "CSS", "basic TypeScript"] },
    ],
    languages: [
      { id: "lang-1", language: "English", fluency: "Native" },
      { id: "lang-2", language: "Spanish", fluency: "Fluent" },
    ],
  };
}
