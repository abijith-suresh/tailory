import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDateRange,
  formatSkillsText,
  renderBulletLines,
  renderDivider,
  renderEntryHeader,
  spacing,
} from "@/lib/export/template-helpers";
import type { PdfMargin, PdfTemplateOptions } from "@/lib/export/template-types";

// Compact ATS template: single column, dense layout, maximum keyword density.
// Optimized for Applicant Tracking Systems: no tables, no images, standard fonts.

const PAGE_MARGINS: PdfMargin = [36, 36, 36, 36];

export function compactAtsTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const content: Content[] = [];
  const contactLine = formatContactLine(resume.basics, {
    includeEmail: true,
    includeLabel: true,
    includeLocation: true,
    includePhone: true,
    includeUrl: true,
    separator: " | ",
  });
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: " | " });

  // Header — all on one line to save space
  content.push({ text: resume.basics.name, style: "name" });
  if (contactLine) {
    content.push({ text: contactLine, style: "contact", margin: spacing.y(1, 8) });
  }
  content.push(renderDivider({ pageMargins: PAGE_MARGINS }));

  if (resume.basics.summary) {
    content.push({ text: "SUMMARY", style: "sectionTitle" });
    content.push({ text: resume.basics.summary, style: "body", margin: spacing.after(6) });
    content.push(renderDivider({ pageMargins: PAGE_MARGINS }));
  }

  if (resume.work && resume.work.length > 0) {
    content.push({ text: "PROFESSIONAL EXPERIENCE", style: "sectionTitle" });
    for (const job of resume.work) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "date",
          dateText: formatDateRange(job.startDate, job.endDate),
          margin: spacing.before(3),
          pageMargins: PAGE_MARGINS,
          subtitle: job.position,
          subtitleMode: "stacked",
          subtitleStyle: "role",
          title: job.name,
          titleStyle: "company",
        })
      );
      if (job.summary) content.push({ text: job.summary, style: "body" });
      content.push(...renderBulletLines(job.highlights, { indent: 8, marker: "-", style: "body" }));
    }
    content.push(renderDivider({ pageMargins: PAGE_MARGINS }));
  }

  if (resume.education && resume.education.length > 0) {
    content.push({ text: "EDUCATION", style: "sectionTitle" });
    for (const edu of resume.education) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "date",
          dateText: formatDateRange(edu.startDate, edu.endDate),
          margin: spacing.before(3),
          pageMargins: PAGE_MARGINS,
          subtitle: [edu.studyType, edu.area].filter(Boolean).join(", "),
          subtitleMode: "stacked",
          subtitleStyle: "role",
          title: edu.institution,
          titleStyle: "company",
        })
      );
      if (edu.score) content.push({ text: `GPA: ${edu.score}`, style: "body" });
    }
    content.push(renderDivider({ pageMargins: PAGE_MARGINS }));
  }

  if (skillsText) {
    content.push({ text: "TECHNICAL SKILLS", style: "sectionTitle" });
    content.push({
      text: skillsText,
      style: "body",
      margin: spacing.after(6),
    });
    content.push(renderDivider({ pageMargins: PAGE_MARGINS }));
  }

  if (resume.projects && resume.projects.length > 0) {
    content.push({ text: "PROJECTS", style: "sectionTitle" });
    for (const proj of resume.projects) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "date",
          dateText: buildProjectMetadata(proj),
          margin: spacing.before(3),
          pageMargins: PAGE_MARGINS,
          title: proj.name,
          titleStyle: "company",
        })
      );
      if (proj.description) content.push({ text: proj.description, style: "body" });
      content.push(
        ...renderBulletLines(proj.highlights, { indent: 8, marker: "-", style: "body" })
      );
    }
    content.push(renderDivider({ pageMargins: PAGE_MARGINS }));
  }

  if (resume.certificates && resume.certificates.length > 0) {
    content.push({ text: "CERTIFICATIONS", style: "sectionTitle" });
    for (const cert of resume.certificates) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "date",
          dateText: cert.date,
          margin: spacing.before(2),
          pageMargins: PAGE_MARGINS,
          subtitle: cert.issuer,
          subtitleMode: "stacked",
          subtitleStyle: "role",
          title: cert.name,
          titleStyle: "body",
        })
      );
    }
  }

  return {
    content,
    styles: {
      name: { fontSize: 16, bold: true, color: "#000000" },
      contact: { fontSize: 9, color: "#374151" },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: "#000000",
        decoration: "underline",
        margin: [0, 6, 0, 3],
      },
      company: { fontSize: 10, bold: true, color: "#111827" },
      role: { fontSize: 9, italics: true, color: "#374151", margin: [0, 1, 0, 1] },
      date: { fontSize: 9, color: "#6b7280" },
      body: { fontSize: 9.5, color: "#111827", lineHeight: 1.35 },
    },
    defaultStyle: { font: options.fontFamily, fontSize: 9.5 },
    pageMargins: PAGE_MARGINS,
  };
}
