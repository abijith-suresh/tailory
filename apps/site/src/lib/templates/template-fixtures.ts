import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";

export function createTemplateFixture(): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    basics: {
      ...structuredClone(EMPTY_RESUME.basics),
      name: "Jane Doe",
      label: "Senior Frontend Engineer",
      email: "jane.doe.very.long.email@example.dev",
      phone: "+1 (555) 123-4567",
      url: "https://janedoe.dev/portfolio/case-studies/export-template-hardening-and-pdf-layout-regression-tests",
      summary:
        "Staff-level engineer focused on ATS-safe resume exports and resilient document layouts.",
      location: {
        city: "San Francisco",
        region: "CA",
        countryCode: "US",
      },
      profiles: [],
    },
    work: [
      {
        id: "work-1",
        name: "Very Long Company Name That Forces Wrapping In PDF Export Layouts Incorporated",
        position: "Senior Software Engineer, Resume Export Platform",
        startDate: "Jan 2021",
        endDate: "Present",
        highlights: [
          "Led export pipeline rewrite across all templates",
          "Fixed bullet rendering, divider sizing, and long URL formatting regressions",
        ],
      },
      {
        id: "work-2",
        name: "No Date Example Co",
        position: "Engineer",
        highlights: ["Exercises missing-date layout handling"],
      },
    ],
    education: [
      {
        id: "edu-1",
        institution: "University of Extremely Long Names and Layout Edge Cases",
        studyType: "B.S.",
        area: "Computer Science",
        startDate: "2016",
        endDate: "2020",
        score: "3.9/4.0",
      },
    ],
    skills: [
      { id: "skill-1", name: "TypeScript" },
      { id: "skill-2", name: "SolidJS" },
      { id: "skill-3", name: "pdfmake" },
    ],
    projects: [
      {
        id: "project-1",
        name: "Template Export Hardening Suite",
        description: "Regression coverage for export templates.",
        highlights: ["Protects bullet rendering", "Verifies long URL and contact formatting"],
        url: "https://github.com/janedoe/template-export-hardening-suite",
      },
    ],
    certificates: [
      {
        id: "cert-1",
        name: "AWS Certified Developer",
        issuer: "Amazon Web Services",
        date: "Sep 2023",
        url: "https://aws.amazon.com/certification/verify/very-long-certificate-id",
      },
    ],
  };
}

export function createUnicodeTemplateFixture(): ResumeSchema {
  const resume = createTemplateFixture();

  resume.basics.name = "Nandana Resume";
  resume.basics.summary =
    "Builds ATS-safe exports for multilingual resumes with bullets • accents like Jose, Chloe, and facade, plus symbols such as pi and checkmarks.";
  resume.work = [
    {
      id: "work-unicode-1",
      name: "Unicode Systems",
      position: "Engineer",
      startDate: "2022",
      endDate: "Present",
      summary: "Improved text fidelity for imported resume content.",
      highlights: [
        "Handled names like Jose Alvarez and Chloe Moreau without glyph corruption",
        "Preserved bullets • and symbols such as pi and checkmarks in export text",
      ],
    },
  ];

  return resume;
}
