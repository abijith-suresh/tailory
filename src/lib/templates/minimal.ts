import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  formatContactLine,
  formatDateRange,
  formatDisplayUrl,
  formatSkillsText,
  joinDefined,
} from "@/lib/export/template-helpers";
import { renderPdfResumeModel } from "@/lib/export/pdf-renderer";
import type { PdfTemplateOptions } from "@/lib/export/template-types";
import {
  resolvePageMargins,
  resolveResumeDesignSettings,
  type ResumeDesignSettings,
} from "@/lib/resume/design";
import type { ResumeRenderModel, ResumeSectionModel } from "@/lib/templates/render-model";

const PAGE_MARGINS = [50, 50, 50, 50] as const;

export function buildMinimalRenderModel(
  resume: ResumeSchema,
  design: ResumeDesignSettings
): ResumeRenderModel {
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: ", " });
  const sections: ResumeSectionModel[] = [];

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
        subtitleMode: "inline",
        meta: formatDateRange(job.startDate, job.endDate),
        body: job.summary,
        bullets: job.highlights,
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
        subtitle: joinDefined([education.studyType, education.area], ", "),
        subtitleMode: "inline",
        meta: formatDateRange(education.startDate, education.endDate),
        details: education.score ? [`GPA: ${education.score}`] : undefined,
      })),
    });
  }

  if (skillsText) {
    sections.push({ id: "skills", kind: "text", text: skillsText, title: "Skills" });
  }

  if (resume.projects && resume.projects.length > 0) {
    sections.push({
      id: "projects",
      kind: "entries",
      title: "Projects",
      entries: resume.projects.map((project) => ({
        title: project.name,
        meta: formatDisplayUrl(project.url),
        body: project.description,
        bullets: project.highlights,
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
        subtitleMode: "inline",
        meta: certificate.date,
      })),
    });
  }

  return {
    template: "minimal",
    design,
    pageMargins: resolvePageMargins(design, [...PAGE_MARGINS]),
    header: {
      name: resume.basics.name,
      label: resume.basics.label,
      contactLine: formatContactLine(resume.basics),
      urlLine: formatDisplayUrl(resume.basics.url),
    },
    sections,
  };
}

export function minimalTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const design = resolveResumeDesignSettings({
    template: "minimal",
    accentColor: options.accentColor,
    pageFormat: options.pageFormat,
    pageMargins: options.pageMargins,
    typography: {
      ...options.typography,
      pdfFontFamily: options.fontFamily,
    },
  });

  return renderPdfResumeModel(buildMinimalRenderModel(resume, design), {
    fontFamily: options.fontFamily,
  });
}
