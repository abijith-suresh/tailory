import type { ResumeSchema } from "@/types/resume";
import type { TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDateRange,
  formatDisplayUrl,
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
        meta: buildProjectMetadata(project),
        body: project.description,
        bullets: project.highlights,
        link: project.url ? (formatDisplayUrl(project.url) ?? project.url) : undefined,
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
