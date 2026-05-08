import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import {
  renderBulletLines,
  renderDivider,
  renderEntryHeader,
  spacing,
} from "@/lib/export/template-helpers";
import type {
  ResumeEntryModel,
  ResumeRenderModel,
  ResumeSectionModel,
} from "@/lib/templates/render-model";

interface PdfRenderOptions {
  fontFamily: string;
}

function renderEntryBody(
  entry: ResumeEntryModel,
  bulletStyle: string,
  bodyStyle: string
): Content[] {
  return [
    ...(entry.body ? [{ text: entry.body, style: bodyStyle } satisfies Content] : []),
    ...(entry.details ?? []).map(
      (detail) => ({ text: detail, style: bodyStyle }) satisfies Content
    ),
    ...renderBulletLines(entry.bullets, { marker: "-", style: bulletStyle }),
    ...(entry.link ? [{ text: entry.link, style: "link" } satisfies Content] : []),
    ...(entry.spacerAfter
      ? [{ text: "", margin: spacing.after(entry.spacerAfter) } satisfies Content]
      : []),
  ];
}

function renderMinimalSection(section: ResumeSectionModel, model: ResumeRenderModel): Content {
  const body =
    section.kind === "text"
      ? [{ text: section.text ?? "", style: "body" } satisfies Content]
      : (section.entries ?? []).flatMap((entry) => [
          ...renderEntryHeader({
            dateStyle: "date",
            dateText: entry.meta,
            margin: spacing.before(6),
            pageMargins: model.pageMargins,
            subtitle: entry.subtitle,
            subtitleMode: entry.subtitleMode ?? "stacked",
            title: entry.title,
            titleStyle: "entryTitle",
          }),
          ...renderEntryBody(entry, "body", "body"),
        ]);

  return {
    stack: [{ text: section.title.toUpperCase(), style: "sectionTitle" }, ...body],
    margin: spacing.after(8),
  };
}

function renderModernSection(section: ResumeSectionModel, model: ResumeRenderModel): Content[] {
  const title = {
    stack: [
      { text: section.title.toUpperCase(), style: "sectionTitle" },
      renderDivider({
        color: model.design.accentColor,
        lineWidth: 1,
        margin: spacing.before(6),
        pageMargins: model.pageMargins,
        pageWidth: model.design.pageWidth,
      }),
    ],
  } satisfies Content;

  const body =
    section.kind === "text"
      ? [{ text: section.text ?? "", style: "body", margin: spacing.after(12) } satisfies Content]
      : (section.entries ?? []).flatMap((entry) => [
          ...renderEntryHeader({
            dateStyle: "dateRange",
            dateText: entry.meta,
            margin: spacing.before(6),
            pageMargins: model.pageMargins,
            subtitle: entry.subtitle,
            subtitleMode: entry.subtitleMode ?? "stacked",
            subtitleStyle: "entrySubtitle",
            title: entry.title,
            titleStyle: "entryTitle",
          }),
          ...renderEntryBody(entry, "bullet", "body"),
        ]);

  return [title, ...body];
}

function renderCompactSection(section: ResumeSectionModel, model: ResumeRenderModel): Content[] {
  const body =
    section.kind === "text"
      ? [{ text: section.text ?? "", style: "body", margin: spacing.after(6) } satisfies Content]
      : (section.entries ?? []).flatMap((entry) => [
          ...renderEntryHeader({
            dateStyle: "date",
            dateText: entry.meta,
            margin: spacing.before(3),
            pageMargins: model.pageMargins,
            subtitle: entry.subtitle,
            subtitleMode: entry.subtitleMode ?? "stacked",
            subtitleStyle: "role",
            title: entry.title,
            titleStyle: entry.subtitle ? "company" : "body",
          }),
          ...renderEntryBody(entry, "body", "body"),
        ]);

  return [
    { text: section.title.toUpperCase(), style: "sectionTitle" } satisfies Content,
    ...body,
    ...(section.dividerAfter
      ? [
          renderDivider({
            color: "#d1d5db",
            pageMargins: model.pageMargins,
            pageWidth: model.design.pageWidth,
          }),
        ]
      : []),
  ];
}

export function renderPdfResumeModel(
  model: ResumeRenderModel,
  options: PdfRenderOptions
): TDocumentDefinitions {
  if (model.template === "modern" || model.template === "signal") {
    return {
      content: [
        {
          stack: [
            { text: model.header.name, style: "name" },
            model.header.label ? { text: model.header.label, style: "label" } : null,
            model.header.contactLine
              ? { text: model.header.contactLine, style: "contactLine" }
              : null,
            model.header.urlLine ? { text: model.header.urlLine, style: "contactLine" } : null,
          ].filter(Boolean) as Content[],
          margin: spacing.after(16),
        },
        ...model.sections.flatMap((section) => renderModernSection(section, model)),
      ],
      styles: {
        name: { fontSize: 22, bold: true, color: "#111827", lineHeight: 1.2 },
        label: { fontSize: 12, color: "#6b7280", margin: [0, 2, 0, 0] },
        contactLine: { fontSize: 9, color: "#6b7280", margin: [0, 1, 0, 0] },
        sectionTitle: {
          fontSize: 10,
          bold: true,
          color: model.design.accentColor,
          margin: [0, 8, 0, 3],
        },
        entryTitle: { fontSize: 11, bold: true, color: "#111827" },
        entrySubtitle: { fontSize: 10, italics: true, color: "#6b7280", margin: [0, 1, 0, 2] },
        dateRange: { fontSize: 9, color: "#6b7280" },
        body: { fontSize: 10, color: "#111827", lineHeight: 1.4 },
        bullet: { fontSize: 10, color: "#111827", lineHeight: 1.4 },
        link: { fontSize: 9, color: model.design.accentColor, decoration: "underline" },
      },
      defaultStyle: { font: options.fontFamily, fontSize: 10 },
      pageMargins: model.pageMargins,
      pageSize: model.design.pageSize,
    };
  }

  if (model.template === "compact-ats") {
    return {
      content: [
        { text: model.header.name, style: "name" },
        ...(model.header.contactLine
          ? [
              {
                text: model.header.contactLine,
                style: "contact",
                margin: spacing.y(1, 8),
              } satisfies Content,
            ]
          : []),
        ...(model.header.dividerAfter
          ? [
              renderDivider({
                color: "#d1d5db",
                pageMargins: model.pageMargins,
                pageWidth: model.design.pageWidth,
              }),
            ]
          : []),
        ...model.sections.flatMap((section) => renderCompactSection(section, model)),
      ],
      styles: {
        name: { fontSize: 16, bold: true, color: "#000000" },
        contact: { fontSize: 9, color: "#374151" },
        sectionTitle: {
          fontSize: 10,
          bold: true,
          color: model.design.accentColor,
          decoration: "underline",
          margin: [0, 6, 0, 3],
        },
        company: { fontSize: 10, bold: true, color: "#111827" },
        role: { fontSize: 9, italics: true, color: "#374151", margin: [0, 1, 0, 1] },
        date: { fontSize: 9, color: "#6b7280" },
        body: { fontSize: 9.5, color: "#111827", lineHeight: 1.35 },
        link: { fontSize: 9, color: model.design.accentColor, decoration: "underline" },
      },
      defaultStyle: { font: options.fontFamily, fontSize: 9.5 },
      pageMargins: model.pageMargins,
      pageSize: model.design.pageSize,
    };
  }

  return {
    content: [
      {
        stack: [
          { text: model.header.name, style: "name" },
          model.header.label ? { text: model.header.label, style: "label" } : null,
          model.header.contactLine ? { text: model.header.contactLine, style: "contact" } : null,
          model.header.urlLine ? { text: model.header.urlLine, style: "contact" } : null,
        ].filter(Boolean) as Content[],
        margin: spacing.after(20),
      },
      ...model.sections.map((section) => renderMinimalSection(section, model)),
    ],
    styles: {
      name: { fontSize: 20, bold: true, color: "#111827" },
      label: { fontSize: 11, color: "#6b7280", margin: [0, 2, 0, 0] },
      contact: { fontSize: 9, color: "#6b7280", margin: [0, 2, 0, 0] },
      sectionTitle: {
        fontSize: 9,
        bold: true,
        color: model.design.accentColor,
        margin: [0, 10, 0, 4],
      },
      entryTitle: { fontSize: 10, bold: true, color: "#111827" },
      date: { fontSize: 9, color: "#9ca3af" },
      body: { fontSize: 10, color: "#374151", lineHeight: 1.4 },
      link: { fontSize: 9, color: model.design.accentColor, decoration: "underline" },
    },
    defaultStyle: { font: options.fontFamily, fontSize: 10 },
    pageMargins: model.pageMargins,
    pageSize: model.design.pageSize,
  };
}
