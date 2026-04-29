import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDateRange,
  formatDisplayUrl,
  formatInterestsText,
  formatLanguagesText,
  formatSkillsText,
} from "@/lib/export/template-helpers";
import { renderPdfResumeModel } from "@/lib/export/pdf-renderer";
import type { PdfTemplateOptions } from "@/lib/export/template-types";
import {
  resolvePageMargins,
  resolveResumeDesignSettings,
  type ResumeDesignSettings,
} from "@/lib/resume/design";
import type { ResumeRenderModel, ResumeSectionModel } from "@/lib/templates/render-model";

const PAGE_MARGINS = [45, 45, 45, 45] as const;

export function buildModernRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const sections: ResumeSectionModel[] = [];
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: " | " });
  const languagesText = formatLanguagesText(resume.languages, { groupSeparator: " | " });
  const interestsText = formatInterestsText(resume.interests, { groupSeparator: " | " });

  if (resume.basics.summary) {
    sections.push({ id: "summary", kind: "text", text: resume.basics.summary, title: "Summary" });
  }

  if (resume.work && resume.work.length > 0) {
    sections.push({
      id: "work",
      kind: "entries",
      title: "Experience",
      entries: resume.work.map((job) => ({
        title: job.name,
        subtitle: job.position,
        subtitleMode: "stacked",
        meta: formatDateRange(job.startDate, job.endDate),
        body: job.summary,
        bullets: job.highlights,
        spacerAfter: 6,
      })),
    });
  }

  if (resume.volunteer && resume.volunteer.length > 0) {
    sections.push({
      id: "volunteer",
      kind: "entries",
      title: "Volunteer",
      entries: resume.volunteer.map((entry) => ({
        title: entry.organization,
        subtitle: entry.position,
        subtitleMode: "stacked",
        meta: formatDateRange(entry.startDate, entry.endDate),
        body: entry.summary,
        bullets: entry.highlights,
        spacerAfter: 6,
      })),
    });
  }

  if (resume.education && resume.education.length > 0) {
    sections.push({
      id: "education",
      kind: "entries",
      title: "Education",
      entries: resume.education.map((education) => ({
        title: education.institution,
        subtitle: [education.studyType, education.area].filter(Boolean).join(", "),
        subtitleMode: "stacked",
        meta: formatDateRange(education.startDate, education.endDate),
        details: education.score ? [`GPA: ${education.score}`] : undefined,
        spacerAfter: 4,
      })),
    });
  }

  if (resume.awards && resume.awards.length > 0) {
    sections.push({
      id: "awards",
      kind: "entries",
      title: "Awards",
      entries: resume.awards.map((award) => ({
        title: award.title,
        subtitle: award.awarder,
        subtitleMode: "stacked",
        meta: award.date,
        body: award.summary,
        spacerAfter: 4,
      })),
    });
  }

  if (resume.publications && resume.publications.length > 0) {
    sections.push({
      id: "publications",
      kind: "entries",
      title: "Publications",
      entries: resume.publications.map((publication) => ({
        title: publication.name,
        subtitle: publication.publisher,
        subtitleMode: "stacked",
        meta: publication.releaseDate,
        body: publication.summary,
        link: publication.url ? (formatDisplayUrl(publication.url) ?? publication.url) : undefined,
        spacerAfter: 4,
      })),
    });
  }

  if (skillsText) {
    sections.push({ id: "skills", kind: "text", text: skillsText, title: "Skills" });
  }

  if (languagesText) {
    sections.push({ id: "languages", kind: "text", text: languagesText, title: "Languages" });
  }

  if (interestsText) {
    sections.push({ id: "interests", kind: "text", text: interestsText, title: "Interests" });
  }

  if (resume.projects && resume.projects.length > 0) {
    sections.push({
      id: "projects",
      kind: "entries",
      title: "Projects",
      entries: resume.projects.map((project) => ({
        title: project.name,
        meta: buildProjectMetadata(project),
        body: project.description,
        bullets: project.highlights,
        link: project.url ? (formatDisplayUrl(project.url) ?? project.url) : undefined,
        spacerAfter: 4,
      })),
    });
  }

  if (resume.references && resume.references.length > 0) {
    sections.push({
      id: "references",
      kind: "entries",
      title: "References",
      entries: resume.references.map((reference) => ({
        title: reference.name,
        body: reference.reference,
        spacerAfter: 4,
      })),
    });
  }

  if (resume.certificates && resume.certificates.length > 0) {
    sections.push({
      id: "certificates",
      kind: "entries",
      title: "Certifications",
      entries: resume.certificates.map((certificate) => ({
        title: certificate.name,
        subtitle: certificate.issuer,
        subtitleMode: "stacked",
        meta: certificate.date,
      })),
    });
  }

  return {
    template: "modern",
    design,
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
    header: {
      name: resume.basics.name,
      label: resume.basics.label,
      contactLine: formatContactLine(resume.basics, {
        includeEmail: true,
        includeLocation: true,
        includePhone: true,
      }),
      urlLine: formatDisplayUrl(resume.basics.url),
    },
    sections,
  };
}

export function modernTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "modern",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildModernRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
