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
});
