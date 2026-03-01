import type { ResumeSchema } from "@/types/resume";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

function section(title: string, body: Content[]): Content {
  return {
    stack: [
      { text: title.toUpperCase(), style: "sectionTitle" },
      ...body,
      { text: "", margin: [0, 8, 0, 0] },
    ],
  };
}

export function minimalTemplate(resume: ResumeSchema): TDocumentDefinitions {
  const content: Content[] = [];

  // Header
  content.push({
    stack: [
      { text: resume.basics.name, style: "name" },
      resume.basics.label ? { text: resume.basics.label, style: "label" } : null,
      {
        text: [resume.basics.email, resume.basics.phone ? ` | ${resume.basics.phone}` : ""]
          .filter(Boolean)
          .join(""),
        style: "contact",
      },
    ].filter(Boolean) as Content[],
    margin: [0, 0, 0, 20],
  });

  if (resume.basics.summary) {
    content.push(section("Summary", [{ text: resume.basics.summary, style: "body" }]));
  }

  if (resume.work && resume.work.length > 0) {
    content.push(
      section(
        "Experience",
        resume.work.flatMap((job) => [
          {
            columns: [
              { text: `${job.name} — ${job.position}`, style: "entryTitle", width: "*" },
              {
                text: [job.startDate, job.endDate].filter(Boolean).join(" – "),
                style: "date",
                width: "auto",
              },
            ],
            margin: [0, 6, 0, 2],
          },
          ...(job.highlights ?? []).map((h) => ({
            text: `• ${h}`,
            style: "body",
          })),
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
              {
                columns: [
                  {
                    text: `${edu.institution}${edu.studyType ? " — " + edu.studyType : ""}`,
                    style: "entryTitle",
                    width: "*",
                  },
                  {
                    text: [edu.startDate, edu.endDate].filter(Boolean).join(" – "),
                    style: "date",
                    width: "auto",
                  },
                ],
                margin: [0, 6, 0, 2],
              },
              edu.area ? { text: edu.area, style: "body" } : null,
            ].filter(Boolean) as Content[]
        )
      )
    );
  }

  if (resume.skills && resume.skills.length > 0) {
    content.push(
      section("Skills", [{ text: resume.skills.map((s) => s.name).join(", "), style: "body" }])
    );
  }

  if (resume.projects && resume.projects.length > 0) {
    content.push(
      section(
        "Projects",
        resume.projects.flatMap(
          (proj) =>
            [
              { text: proj.name, style: "entryTitle", margin: [0, 6, 0, 2] },
              proj.description ? { text: proj.description, style: "body" } : null,
              ...(proj.highlights ?? []).map((h) => ({ text: `• ${h}`, style: "body" })),
            ].filter(Boolean) as Content[]
        )
      )
    );
  }

  if (resume.certificates && resume.certificates.length > 0) {
    content.push(
      section(
        "Certifications",
        resume.certificates.map((cert) => ({
          text: [cert.name, cert.issuer, cert.date].filter(Boolean).join(" · "),
          style: "body",
          margin: [0, 2, 0, 0],
        }))
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
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    pageMargins: [50, 50, 50, 50],
  };
}
