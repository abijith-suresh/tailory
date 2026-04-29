import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDateRange,
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

// Compact ATS template: single column, dense layout, maximum keyword density.
// Optimized for Applicant Tracking Systems: no tables, no images, standard fonts.

const PAGE_MARGINS = [36, 36, 36, 36] as const;

export function buildCompactAtsRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const sections: ResumeSectionModel[] = [];
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: " | " });
  const languagesText = formatLanguagesText(resume.languages, { groupSeparator: " | " });
  const interestsText = formatInterestsText(resume.interests, { groupSeparator: " | " });

  if (resume.basics.summary) {
    sections.push({
      id: "summary",
      kind: "text",
      text: resume.basics.summary,
      title: "Summary",
      dividerAfter: true,
    });
  }

  if (resume.work && resume.work.length > 0) {
    sections.push({
      id: "work",
      kind: "entries",
      title: "Professional Experience",
      dividerAfter: true,
      entries: resume.work.map((job) => ({
        title: job.name,
        subtitle: job.position,
        subtitleMode: "stacked",
        meta: formatDateRange(job.startDate, job.endDate),
        body: job.summary,
        bullets: job.highlights,
      })),
    });
  }

  if (resume.volunteer && resume.volunteer.length > 0) {
    sections.push({
      id: "volunteer",
      kind: "entries",
      title: "Volunteer Experience",
      dividerAfter: true,
      entries: resume.volunteer.map((entry) => ({
        title: entry.organization,
        subtitle: entry.position,
        subtitleMode: "stacked",
        meta: formatDateRange(entry.startDate, entry.endDate),
        body: entry.summary,
        bullets: entry.highlights,
      })),
    });
  }

  if (resume.education && resume.education.length > 0) {
    sections.push({
      id: "education",
      kind: "entries",
      title: "Education",
      dividerAfter: true,
      entries: resume.education.map((education) => ({
        title: education.institution,
        subtitle: [education.studyType, education.area].filter(Boolean).join(", "),
        subtitleMode: "stacked",
        meta: formatDateRange(education.startDate, education.endDate),
        details: education.score ? [`GPA: ${education.score}`] : undefined,
      })),
    });
  }

  if (resume.awards && resume.awards.length > 0) {
    sections.push({
      id: "awards",
      kind: "entries",
      title: "Awards",
      dividerAfter: true,
      entries: resume.awards.map((award) => ({
        title: award.title,
        subtitle: award.awarder,
        subtitleMode: "stacked",
        meta: award.date,
        body: award.summary,
      })),
    });
  }

  if (resume.publications && resume.publications.length > 0) {
    sections.push({
      id: "publications",
      kind: "entries",
      title: "Publications",
      dividerAfter: true,
      entries: resume.publications.map((publication) => ({
        title: publication.name,
        subtitle: publication.publisher,
        subtitleMode: "stacked",
        meta: publication.releaseDate,
        body: publication.summary,
      })),
    });
  }

  if (skillsText) {
    sections.push({
      id: "skills",
      kind: "text",
      text: skillsText,
      title: "Technical Skills",
      dividerAfter: true,
    });
  }

  if (languagesText) {
    sections.push({
      id: "languages",
      kind: "text",
      text: languagesText,
      title: "Languages",
      dividerAfter: true,
    });
  }

  if (interestsText) {
    sections.push({
      id: "interests",
      kind: "text",
      text: interestsText,
      title: "Interests",
      dividerAfter: true,
    });
  }

  if (resume.projects && resume.projects.length > 0) {
    sections.push({
      id: "projects",
      kind: "entries",
      title: "Projects",
      dividerAfter: true,
      entries: resume.projects.map((project) => ({
        title: project.name,
        meta: buildProjectMetadata(project),
        body: project.description,
        bullets: project.highlights,
      })),
    });
  }

  if (resume.references && resume.references.length > 0) {
    sections.push({
      id: "references",
      kind: "entries",
      title: "References",
      dividerAfter: true,
      entries: resume.references.map((reference) => ({
        title: reference.name,
        body: reference.reference,
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
    template: "compact-ats",
    design,
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
    header: {
      name: resume.basics.name,
      dividerAfter: true,
      contactLine: formatContactLine(resume.basics, {
        includeEmail: true,
        includeLabel: true,
        includeLocation: true,
        includePhone: true,
        includeUrl: true,
        separator: " | ",
      }),
    },
    sections,
  };
}

export function compactAtsTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "compact-ats",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildCompactAtsRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
