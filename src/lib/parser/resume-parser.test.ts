import { describe, expect, it } from "vitest";
import { parseResume } from "./resume-parser";

const SAMPLE_RESUME = `
JANE DOE
Software Engineer
jane.doe@email.com | +1 555-123-4567 | https://linkedin.com/in/janedoe

SUMMARY
Results-driven software engineer with 5+ years of experience building web applications.

EXPERIENCE
Acme Corp
Senior Software Engineer
Jan 2021 - Present
• Led development of microservices architecture serving 1M+ users
• Reduced latency by 40% through caching improvements
• Mentored 3 junior engineers

Previous Company
Software Engineer
Jun 2018 - Dec 2020
• Built REST APIs using Node.js and PostgreSQL
• Improved test coverage from 30% to 85%

EDUCATION
University of Technology
Bachelor of Science in Computer Science
2014 - 2018

SKILLS
TypeScript, JavaScript, React, Node.js, PostgreSQL, Docker, AWS, Git

PROJECTS
Open Source CLI Tool
A command-line tool for automating deployments
• Built with Node.js and TypeScript
• 500+ GitHub stars
https://github.com/janedoe/cli-tool

CERTIFICATIONS
AWS Certified Solutions Architect, 2022
Google Cloud Professional, 2023
`;

describe("parseResume", () => {
  it("extracts basics (name, email, phone)", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.basics.name).toBe("JANE DOE");
    expect(result.data.basics.email).toBe("jane.doe@email.com");
    expect(result.data.basics.phone).toMatch(/555-123-4567/);
  });

  it("extracts work experience entries", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.work).toBeDefined();
    expect(result.data.work!.length).toBeGreaterThan(0);
  });

  it("extracts education", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.education).toBeDefined();
    expect(result.data.education!.length).toBeGreaterThan(0);
    expect(result.data.education![0].institution).toContain("University");
  });

  it("extracts skills", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.skills).toBeDefined();
    expect(result.data.skills!.length).toBeGreaterThan(3);
    const skillNames = result.data.skills!.map((s) => s.name);
    expect(skillNames).toContain("TypeScript");
  });

  it("extracts projects", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.projects).toBeDefined();
    expect(result.data.projects!.length).toBeGreaterThan(0);
  });

  it("extracts certificates", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.data.certificates).toBeDefined();
    expect(result.data.certificates!.length).toBeGreaterThan(0);
  });

  it("returns a confidence score between 0 and 100", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("returns rawSections with at least header, work, and education", async () => {
    const result = await parseResume(SAMPLE_RESUME);
    expect(result.rawSections).toHaveProperty("header");
    expect(result.rawSections).toHaveProperty("work");
    expect(result.rawSections).toHaveProperty("education");
  });

  it("handles empty text gracefully", async () => {
    const result = await parseResume("");
    expect(result.data.basics.name).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("detects decorated section headings", async () => {
    const result = await parseResume(`
JANE DOE
jane.doe@email.com

=== Professional Experience ===
Acme Corp
Senior Engineer
2021 - Present
• Shipped core platform updates

*** Technical Skills ***
TypeScript | SolidJS | PostgreSQL
`);

    expect(result.rawSections).toHaveProperty("work");
    expect(result.rawSections).toHaveProperty("skills");
    expect(result.data.work?.[0]?.name).toBe("Acme Corp");
    expect(result.data.skills?.map((skill) => skill.name)).toEqual([
      "TypeScript",
      "SolidJS",
      "PostgreSQL",
    ]);
  });

  it("splits single-newline work entries when each entry is contiguous", async () => {
    const result = await parseResume(`
JANE DOE
jane.doe@email.com

EXPERIENCE
Acme Corp
Senior Engineer
Jan 2021 - Present
• Led migration to Astro
Beta Labs
Software Engineer
Jun 2018 - Dec 2020
• Built internal tooling
`);

    expect(result.data.work).toHaveLength(2);
    expect(result.data.work?.[0]).toMatchObject({
      name: "Acme Corp",
      position: "Senior Engineer",
      startDate: "Jan 2021",
      endDate: "Present",
    });
    expect(result.data.work?.[1]).toMatchObject({
      name: "Beta Labs",
      position: "Software Engineer",
      startDate: "Jun 2018",
      endDate: "Dec 2020",
    });
  });

  it("tokenizes noisy skills blocks without keeping category labels", async () => {
    const result = await parseResume(`
JANE DOE
jane.doe@email.com

SKILLS
Languages: TypeScript / JavaScript / SQL
Frameworks: SolidJS, Astro; Tailwind CSS
• Testing: Vitest | Playwright
`);

    expect(result.data.skills?.map((skill) => skill.name)).toEqual([
      "TypeScript",
      "JavaScript",
      "SQL",
      "SolidJS",
      "Astro",
      "Tailwind CSS",
      "Vitest",
      "Playwright",
    ]);
  });

  it("parses certificate issuer and date from common formats", async () => {
    const result = await parseResume(`
JANE DOE
jane.doe@email.com

CERTIFICATIONS
AWS Certified Solutions Architect - Amazon Web Services - 2022
Professional Scrum Master by Scrum.org, Jan 2023
`);

    expect(result.data.certificates).toHaveLength(2);
    expect(result.data.certificates?.[0]).toMatchObject({
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      date: "2022",
    });
    expect(result.data.certificates?.[1]).toMatchObject({
      name: "Professional Scrum Master",
      issuer: "Scrum.org",
      date: "Jan 2023",
    });
  });

  it("parses inline section headings and merged contact headers", async () => {
    const result = await parseResume(`
JANE DOE - Senior Software Engineer
jane.doe@email.com | +1 555-123-4567 | github.com/janedoe
SUMMARY: Product-minded engineer building web apps.
SKILLS: TypeScript | SolidJS | PostgreSQL
`);

    expect(result.data.basics.name).toBe("JANE DOE - Senior Software Engineer");
    expect(result.data.basics.email).toBe("jane.doe@email.com");
    expect(result.rawSections.summary).toBe("Product-minded engineer building web apps.");
    expect(result.data.skills?.map((skill) => skill.name)).toEqual([
      "TypeScript",
      "SolidJS",
      "PostgreSQL",
    ]);
  });

  it("splits compact project and education entries without blank lines", async () => {
    const result = await parseResume(`
JANE DOE
jane.doe@email.com

PROJECTS
Project One
• Built feature one
Project Two
• Built feature two

EDUCATION
• M.Tech in Artificial Intelligence and Data Science
Alliance School of Advanced Computing 2025-2027
• B.Tech in Computer Science and Engineering
Adi Shankara Institute of Engineering and Technology 2021-2025
`);

    expect(result.data.projects).toHaveLength(2);
    expect(result.data.projects?.[0]).toMatchObject({
      name: "Project One",
      highlights: ["Built feature one"],
    });
    expect(result.data.projects?.[1]).toMatchObject({
      name: "Project Two",
      highlights: ["Built feature two"],
    });
    expect(result.data.education).toHaveLength(2);
    expect(result.data.education?.[0]).toMatchObject({
      studyType: "M.Tech in Artificial Intelligence and Data Science",
      institution: "Alliance School of Advanced Computing",
      startDate: "2025",
      endDate: "2027",
    });
    expect(result.data.education?.[1]).toMatchObject({
      studyType: "B.Tech in Computer Science and Engineering",
      institution: "Adi Shankara Institute of Engineering and Technology",
      startDate: "2021",
      endDate: "2025",
    });
  });
});
