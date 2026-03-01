import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

const COLORS = {
  primary: "#312e81", // indigo-900
  accent: "#4f46e5", // indigo-600
  text: "#111827",
  muted: "#6b7280",
  divider: "#e5e7eb",
};

function sectionTitle(title: string): Content {
  return {
    stack: [
      { text: title.toUpperCase(), style: "sectionTitle" },
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: COLORS.accent },
        ],
      },
      { text: "", margin: [0, 6, 0, 0] },
    ],
  };
}

function bulletList(items: string[]): Content {
  return {
    ul: items.map((item) => ({ text: item, style: "bullet" })),
    margin: [0, 2, 0, 0],
  };
}

export function modernTemplate(resume: ResumeSchema): TDocumentDefinitions {
  const content: Content[] = [];

  // ── Header ───────────────────────────────────────────────────────────────
  content.push({
    stack: [
      { text: resume.basics.name, style: "name" },
      resume.basics.label ? { text: resume.basics.label, style: "label" } : null,
      {
        text: [
          resume.basics.email,
          resume.basics.phone ? ` | ${resume.basics.phone}` : "",
          resume.basics.location?.city
            ? ` | ${resume.basics.location.city}${resume.basics.location.region ? ", " + resume.basics.location.region : ""}`
            : "",
        ]
          .filter(Boolean)
          .join(""),
        style: "contactLine",
      },
      resume.basics.url ? { text: resume.basics.url, style: "contactLine" } : null,
    ].filter(Boolean) as Content[],
    margin: [0, 0, 0, 16],
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  if (resume.basics.summary) {
    content.push(sectionTitle("Summary"));
    content.push({ text: resume.basics.summary, style: "body", margin: [0, 0, 0, 12] });
  }

  // ── Work ─────────────────────────────────────────────────────────────────
  if (resume.work && resume.work.length > 0) {
    content.push(sectionTitle("Experience"));
    for (const job of resume.work) {
      content.push({
        columns: [
          { text: job.name, style: "entryTitle", width: "*" },
          {
            text: [job.startDate, job.endDate ? " – " + job.endDate : ""].filter(Boolean).join(""),
            style: "dateRange",
            width: "auto",
          },
        ],
        margin: [0, 6, 0, 0],
      });
      if (job.position) content.push({ text: job.position, style: "entrySubtitle" });
      if (job.highlights && job.highlights.length > 0) content.push(bulletList(job.highlights));
      content.push({ text: "", margin: [0, 6, 0, 0] });
    }
  }

  // ── Education ─────────────────────────────────────────────────────────────
  if (resume.education && resume.education.length > 0) {
    content.push(sectionTitle("Education"));
    for (const edu of resume.education) {
      content.push({
        columns: [
          { text: edu.institution, style: "entryTitle", width: "*" },
          {
            text: [edu.startDate, edu.endDate ? " – " + edu.endDate : ""].filter(Boolean).join(""),
            style: "dateRange",
            width: "auto",
          },
        ],
        margin: [0, 6, 0, 0],
      });
      const degreeText = [edu.studyType, edu.area].filter(Boolean).join(", ");
      if (degreeText) content.push({ text: degreeText, style: "entrySubtitle" });
      if (edu.score) content.push({ text: `GPA: ${edu.score}`, style: "body" });
      content.push({ text: "", margin: [0, 4, 0, 0] });
    }
  }

  // ── Skills ────────────────────────────────────────────────────────────────
  if (resume.skills && resume.skills.length > 0) {
    content.push(sectionTitle("Skills"));
    content.push({
      text: resume.skills.map((s) => s.name).join(" · "),
      style: "body",
      margin: [0, 0, 0, 12],
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  if (resume.projects && resume.projects.length > 0) {
    content.push(sectionTitle("Projects"));
    for (const proj of resume.projects) {
      content.push({ text: proj.name, style: "entryTitle", margin: [0, 6, 0, 0] });
      if (proj.description) content.push({ text: proj.description, style: "body" });
      if (proj.highlights && proj.highlights.length > 0) content.push(bulletList(proj.highlights));
      if (proj.url) content.push({ text: proj.url, style: "link" });
      content.push({ text: "", margin: [0, 4, 0, 0] });
    }
  }

  // ── Certificates ─────────────────────────────────────────────────────────
  if (resume.certificates && resume.certificates.length > 0) {
    content.push(sectionTitle("Certifications"));
    for (const cert of resume.certificates) {
      content.push({
        columns: [
          { text: cert.name, style: "entryTitle", width: "*" },
          { text: cert.date ?? "", style: "dateRange", width: "auto" },
        ],
        margin: [0, 4, 0, 0],
      });
      if (cert.issuer) content.push({ text: cert.issuer, style: "entrySubtitle" });
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
        letterSpacing: 1,
        margin: [0, 8, 0, 3],
      },
      entryTitle: { fontSize: 11, bold: true, color: COLORS.text },
      entrySubtitle: { fontSize: 10, italics: true, color: COLORS.muted, margin: [0, 1, 0, 2] },
      dateRange: { fontSize: 9, color: COLORS.muted },
      body: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      bullet: { fontSize: 10, color: COLORS.text, lineHeight: 1.4 },
      link: { fontSize: 9, color: COLORS.accent, decoration: "underline" },
    },
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    pageMargins: [45, 45, 45, 45],
  };
}
