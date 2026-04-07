import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  formatContactLine,
  formatDateRange,
  formatDisplayUrl,
  formatSkillsText,
  joinDefined,
  renderBulletLines,
  renderEntryHeader,
  spacing,
} from "@/lib/export/template-helpers";
import type { PdfMargin, PdfTemplateOptions } from "@/lib/export/template-types";

const PAGE_MARGINS: PdfMargin = [50, 50, 50, 50];

function section(title: string, body: Content[]): Content {
  return {
    stack: [{ text: title.toUpperCase(), style: "sectionTitle" }, ...body],
    margin: spacing.after(8),
  };
}

export function minimalTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const content: Content[] = [];
  const contactLine = formatContactLine(resume.basics);
  const urlLine = formatDisplayUrl(resume.basics.url);
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: ", " });

  // Header
  content.push({
    stack: [
      { text: resume.basics.name, style: "name" },
      resume.basics.label ? { text: resume.basics.label, style: "label" } : null,
      contactLine ? { text: contactLine, style: "contact" } : null,
      urlLine ? { text: urlLine, style: "contact" } : null,
    ].filter(Boolean) as Content[],
    margin: spacing.after(20),
  });

  if (resume.basics.summary) {
    content.push(section("Summary", [{ text: resume.basics.summary, style: "body" }]));
  }

  if (resume.work && resume.work.length > 0) {
    content.push(
      section(
        "Experience",
        resume.work.flatMap((job) => [
          ...renderEntryHeader({
            dateStyle: "date",
            dateText: formatDateRange(job.startDate, job.endDate),
            margin: spacing.before(6),
            pageMargins: PAGE_MARGINS,
            subtitle: job.position,
            subtitleMode: "inline",
            title: job.name,
            titleStyle: "entryTitle",
          }),
          ...(job.summary ? [{ text: job.summary, style: "body" } satisfies Content] : []),
          ...renderBulletLines(job.highlights, { marker: "-", style: "body" }),
        ])
      )
    );
  }

  if (resume.education && resume.education.length > 0) {
    content.push(
      section(
        "Education",
        resume.education.flatMap(
          (edu) =>
            [
              ...renderEntryHeader({
                dateStyle: "date",
                dateText: formatDateRange(edu.startDate, edu.endDate),
                margin: spacing.before(6),
                pageMargins: PAGE_MARGINS,
                subtitle: joinDefined([edu.studyType, edu.area], ", "),
                subtitleMode: "inline",
                title: edu.institution,
                titleStyle: "entryTitle",
              }),
              edu.score ? { text: `GPA: ${edu.score}`, style: "body" } : null,
              edu.area ? { text: edu.area, style: "body" } : null,
            ].filter(Boolean) as Content[]
        )
      )
    );
  }

  if (skillsText) {
    content.push(section("Skills", [{ text: skillsText, style: "body" }]));
  }

  if (resume.projects && resume.projects.length > 0) {
    content.push(
      section(
        "Projects",
        resume.projects.flatMap(
          (proj) =>
            [
              ...renderEntryHeader({
                dateStyle: "date",
                dateText: proj.url ? formatDisplayUrl(proj.url) : undefined,
                margin: spacing.before(6),
                pageMargins: PAGE_MARGINS,
                title: proj.name,
                titleStyle: "entryTitle",
              }),
              proj.description ? { text: proj.description, style: "body" } : null,
              ...renderBulletLines(proj.highlights, { marker: "-", style: "body" }),
            ].filter(Boolean) as Content[]
        )
      )
    );
  }

  if (resume.certificates && resume.certificates.length > 0) {
    content.push(
      section(
        "Certifications",
        resume.certificates.flatMap((cert) =>
          renderEntryHeader({
            dateStyle: "date",
            dateText: cert.date,
            margin: spacing.before(2),
            pageMargins: PAGE_MARGINS,
            subtitle: cert.issuer,
            subtitleMode: "inline",
            title: cert.name,
            titleStyle: "body",
          })
        )
      )
    );
  }

  return {
    content,
    styles: {
      name: { fontSize: 20, bold: true, color: "#111827" },
      label: { fontSize: 11, color: "#6b7280", margin: [0, 2, 0, 0] },
      contact: { fontSize: 9, color: "#6b7280", margin: [0, 2, 0, 0] },
      sectionTitle: {
        fontSize: 9,
        bold: true,
        color: "#374151",
        margin: [0, 10, 0, 4],
      },
      entryTitle: { fontSize: 10, bold: true, color: "#111827" },
      date: { fontSize: 9, color: "#9ca3af" },
      body: { fontSize: 10, color: "#374151", lineHeight: 1.4 },
    },
    defaultStyle: { font: options.fontFamily, fontSize: 10 },
    pageMargins: PAGE_MARGINS,
  };
}
