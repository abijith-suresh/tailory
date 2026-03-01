import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

// Compact ATS template: single column, dense layout, maximum keyword density.
// Optimized for Applicant Tracking Systems: no tables, no images, standard fonts.

function divider(): Content {
  return {
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#d1d5db" }],
    margin: [0, 4, 0, 4],
  };
}

export function compactAtsTemplate(resume: ResumeSchema): TDocumentDefinitions {
  const content: Content[] = [];

  // Header — all on one line to save space
  content.push({ text: resume.basics.name, style: "name" });
  const contactParts = [
    resume.basics.label,
    resume.basics.email,
    resume.basics.phone,
    resume.basics.location?.city
      ? `${resume.basics.location.city}${resume.basics.location.region ? ", " + resume.basics.location.region : ""}`
      : null,
    resume.basics.url,
  ].filter(Boolean);

  content.push({ text: contactParts.join(" | "), style: "contact", margin: [0, 1, 0, 8] });
  content.push(divider());

  if (resume.basics.summary) {
    content.push({ text: "SUMMARY", style: "sectionTitle" });
    content.push({ text: resume.basics.summary, style: "body", margin: [0, 0, 0, 6] });
    content.push(divider());
  }

  if (resume.work && resume.work.length > 0) {
    content.push({ text: "PROFESSIONAL EXPERIENCE", style: "sectionTitle" });
    for (const job of resume.work) {
      const dateStr = [job.startDate, job.endDate].filter(Boolean).join(" – ");
      content.push({
        columns: [
          { text: job.name, style: "company", width: "*" },
          { text: dateStr, style: "date", width: "auto" },
        ],
        margin: [0, 3, 0, 0],
      });
      if (job.position) content.push({ text: job.position, style: "role" });
      for (const h of job.highlights ?? []) {
        content.push({ text: `• ${h}`, style: "body", margin: [8, 1, 0, 0] });
      }
    }
    content.push(divider());
  }

  if (resume.education && resume.education.length > 0) {
    content.push({ text: "EDUCATION", style: "sectionTitle" });
    for (const edu of resume.education) {
      const dateStr = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
      content.push({
        columns: [
          { text: edu.institution, style: "company", width: "*" },
          { text: dateStr, style: "date", width: "auto" },
        ],
        margin: [0, 3, 0, 0],
      });
      const degree = [edu.studyType, edu.area].filter(Boolean).join(", ");
      if (degree) content.push({ text: degree, style: "role" });
      if (edu.score) content.push({ text: `GPA: ${edu.score}`, style: "body" });
    }
    content.push(divider());
  }

  if (resume.skills && resume.skills.length > 0) {
    content.push({ text: "TECHNICAL SKILLS", style: "sectionTitle" });
    content.push({
      text: resume.skills.map((s) => s.name).join(" | "),
      style: "body",
      margin: [0, 0, 0, 6],
    });
    content.push(divider());
  }

  if (resume.projects && resume.projects.length > 0) {
    content.push({ text: "PROJECTS", style: "sectionTitle" });
    for (const proj of resume.projects) {
      content.push({ text: proj.name, style: "company", margin: [0, 3, 0, 0] });
      if (proj.description) content.push({ text: proj.description, style: "body" });
      for (const h of proj.highlights ?? []) {
        content.push({ text: `• ${h}`, style: "body", margin: [8, 1, 0, 0] });
      }
    }
    content.push(divider());
  }

  if (resume.certificates && resume.certificates.length > 0) {
    content.push({ text: "CERTIFICATIONS", style: "sectionTitle" });
    for (const cert of resume.certificates) {
      content.push({
        text: [cert.name, cert.issuer ? `(${cert.issuer})` : null, cert.date]
          .filter(Boolean)
          .join(" "),
        style: "body",
        margin: [0, 2, 0, 0],
      });
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
    defaultStyle: { font: "Helvetica", fontSize: 9.5 },
    pageMargins: [36, 36, 36, 36],
  };
}
