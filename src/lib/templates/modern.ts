import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  buildProjectMetadata,
  formatContactLine,
  formatDateRange,
  formatDisplayUrl,
  formatSkillsText,
  renderBulletLines,
  renderDivider,
  renderEntryHeader,
  spacing,
} from "@/lib/export/template-helpers";
import type { PdfMargin, PdfTemplateOptions } from "@/lib/export/template-types";

const COLORS = {
  primary: "#312e81", // indigo-900
  accent: "#4f46e5", // indigo-600
  text: "#111827",
  muted: "#6b7280",
};

const PAGE_MARGINS: PdfMargin = [45, 45, 45, 45];

function sectionTitle(title: string): Content {
  return {
    stack: [
      { text: title.toUpperCase(), style: "sectionTitle" },
      renderDivider({
        color: COLORS.accent,
        lineWidth: 1,
        margin: spacing.before(6),
        pageMargins: PAGE_MARGINS,
      }),
    ],
  };
}

export function modernTemplate(
  resume: ResumeSchema,
  options: PdfTemplateOptions
): TDocumentDefinitions {
  const content: Content[] = [];
  const contactLine = formatContactLine(resume.basics, {
    includeEmail: true,
    includeLocation: true,
    includePhone: true,
  });
  const displayUrl = formatDisplayUrl(resume.basics.url);
  const skillsText = formatSkillsText(resume.skills, { groupSeparator: " | " });

  // ── Header ───────────────────────────────────────────────────────────────
  content.push({
    stack: [
      { text: resume.basics.name, style: "name" },
      resume.basics.label ? { text: resume.basics.label, style: "label" } : null,
      contactLine ? { text: contactLine, style: "contactLine" } : null,
      displayUrl ? { text: displayUrl, style: "contactLine" } : null,
    ].filter(Boolean) as Content[],
    margin: spacing.after(16),
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  if (resume.basics.summary) {
    content.push(sectionTitle("Summary"));
    content.push({ text: resume.basics.summary, style: "body", margin: spacing.after(12) });
  }

  // ── Work ─────────────────────────────────────────────────────────────────
  if (resume.work && resume.work.length > 0) {
    content.push(sectionTitle("Experience"));
    for (const job of resume.work) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "dateRange",
          dateText: formatDateRange(job.startDate, job.endDate),
          margin: spacing.before(6),
          pageMargins: PAGE_MARGINS,
          subtitle: job.position,
          subtitleMode: "stacked",
          subtitleStyle: "entrySubtitle",
          title: job.name,
          titleStyle: "entryTitle",
        })
      );
      if (job.summary) content.push({ text: job.summary, style: "body" });
      content.push(...renderBulletLines(job.highlights, { style: "bullet" }));
      content.push({ text: "", margin: spacing.after(6) });
    }
  }

  // ── Education ─────────────────────────────────────────────────────────────
  if (resume.education && resume.education.length > 0) {
    content.push(sectionTitle("Education"));
    for (const edu of resume.education) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "dateRange",
          dateText: formatDateRange(edu.startDate, edu.endDate),
          margin: spacing.before(6),
          pageMargins: PAGE_MARGINS,
          subtitle: [edu.studyType, edu.area].filter(Boolean).join(", "),
          subtitleMode: "stacked",
          subtitleStyle: "entrySubtitle",
          title: edu.institution,
          titleStyle: "entryTitle",
        })
      );
      if (edu.score) content.push({ text: `GPA: ${edu.score}`, style: "body" });
      content.push({ text: "", margin: spacing.after(4) });
    }
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  if (skillsText) {
    content.push(sectionTitle("Skills"));
    content.push({
      text: skillsText,
      style: "body",
      margin: spacing.after(12),
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  if (resume.projects && resume.projects.length > 0) {
    content.push(sectionTitle("Projects"));
    for (const proj of resume.projects) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "dateRange",
          dateText: buildProjectMetadata(proj),
          margin: spacing.before(6),
          pageMargins: PAGE_MARGINS,
          title: proj.name,
          titleStyle: "entryTitle",
        })
      );
      if (proj.description) content.push({ text: proj.description, style: "body" });
      content.push(...renderBulletLines(proj.highlights, { style: "bullet" }));
      if (proj.url) content.push({ text: formatDisplayUrl(proj.url) ?? proj.url, style: "link" });
      content.push({ text: "", margin: spacing.after(4) });
    }
  }

  // ── Certificates ─────────────────────────────────────────────────────────
  if (resume.certificates && resume.certificates.length > 0) {
    content.push(sectionTitle("Certifications"));
    for (const cert of resume.certificates) {
      content.push(
        ...renderEntryHeader({
          dateStyle: "dateRange",
          dateText: cert.date,
          margin: spacing.before(4),
          pageMargins: PAGE_MARGINS,
          subtitle: cert.issuer,
          subtitleMode: "stacked",
          subtitleStyle: "entrySubtitle",
          title: cert.name,
          titleStyle: "entryTitle",
        })
      );
    }
  }

  return {
    content,
    styles: {
      name: { fontSize: 22, bold: true, color: COLORS.primary, lineHeight: 1.2 },
      label: { fontSize: 12, color: COLORS.muted, margin: [0, 2, 0, 0] },
      contactLine: { fontSize: 9, color: COLORS.muted, margin: [0, 1, 0, 0] },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: COLORS.accent,
        margin: [0, 8, 0, 3],
      },
      entryTitle: { fontSize: 11, bold: true, color: COLORS.text },
      entrySubtitle: { fontSize: 10, italics: true, color: COLORS.muted, margin: [0, 1, 0, 2] },
      dateRange: { fontSize: 9, color: COLORS.muted },
      body: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      bullet: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      link: { fontSize: 9, color: COLORS.accent, decoration: "underline" },
    },
    defaultStyle: { font: options.fontFamily, fontSize: 10 },
    pageMargins: PAGE_MARGINS,
  };
}
