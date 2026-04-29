import type {
  ResumeBasics,
  ResumeInterest,
  ResumeLanguage,
  ResumeLocation,
  ResumeProject,
  ResumeSkill,
} from "@/types/resume";
import type { Content, Margins } from "pdfmake/interfaces";

import type { PdfMargin } from "@/lib/resume/design";

const A4_PAGE_WIDTH = 595.28;

function getMarginValues(margin: Margins): [number, number, number, number] {
  if (typeof margin === "number") {
    return [margin, margin, margin, margin];
  }

  if (margin.length === 2) {
    return [margin[0], margin[1], margin[0], margin[1]];
  }

  return [margin[0], margin[1], margin[2], margin[3]];
}

export function joinDefined(
  parts: Array<string | undefined | null>,
  separator = " | "
): string | undefined {
  const values = parts.map((part) => part?.trim()).filter(Boolean) as string[];
  return values.length > 0 ? values.join(separator) : undefined;
}

export function formatLocation(location?: ResumeLocation): string | undefined {
  return joinDefined([location?.city, location?.region], ", ");
}

export function formatDisplayUrl(url?: string): string | undefined {
  if (!url) return undefined;

  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

export interface ContactLineOptions {
  includeEmail?: boolean;
  includeLabel?: boolean;
  includeLocation?: boolean;
  includePhone?: boolean;
  includeUrl?: boolean;
  separator?: string;
}

export function formatContactLine(
  basics: ResumeBasics,
  options: ContactLineOptions = {}
): string | undefined {
  const {
    includeEmail = true,
    includeLabel = false,
    includeLocation = false,
    includePhone = true,
    includeUrl = false,
    separator = " | ",
  } = options;

  return joinDefined(
    [
      includeLabel ? basics.label : undefined,
      includeEmail ? basics.email : undefined,
      includePhone ? basics.phone : undefined,
      includeLocation ? formatLocation(basics.location) : undefined,
      includeUrl ? formatDisplayUrl(basics.url) : undefined,
    ],
    separator
  );
}

export function formatDateRange(startDate?: string, endDate?: string): string | undefined {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }

  return startDate || endDate || undefined;
}

export interface EntryHeaderOptions {
  dateStyle: string;
  dateText?: string;
  margin?: Margins;
  pageMargins?: PdfMargin;
  subtitle?: string;
  subtitleMode?: "inline" | "stacked";
  subtitleStyle?: string;
  title: string;
  titleStyle: string;
}

export function renderEntryHeader(options: EntryHeaderOptions): Content[] {
  const {
    dateStyle,
    dateText,
    margin = [0, 6, 0, 0],
    pageMargins,
    subtitle,
    subtitleMode = "stacked",
    subtitleStyle,
    title,
    titleStyle,
  } = options;

  const headerWidth = pageMargins ? getContentWidth(pageMargins) : 0;
  const titleNode: Content = {
    text: subtitleMode === "inline" ? (joinDefined([title, subtitle], " - ") ?? title) : title,
    style: titleStyle,
  };

  const row = dateText
    ? {
        columns: [
          titleNode,
          {
            text: dateText,
            style: dateStyle,
            alignment: "right" as const,
            width: pageMargins ? Math.min(110, headerWidth * 0.24) : "auto",
          },
        ],
        columnGap: 12,
        margin,
        unbreakable: true,
      }
    : {
        ...titleNode,
        margin,
        unbreakable: true,
      };

  const nodes: Content[] = [row];

  if (subtitle && subtitleMode === "stacked" && subtitleStyle) {
    nodes.push({ text: subtitle, style: subtitleStyle, unbreakable: true });
  }

  return nodes;
}

export interface DividerOptions {
  color?: string;
  lineWidth?: number;
  margin?: Margins;
  pageMargins: PdfMargin;
  pageWidth?: number;
}

export function renderDivider(options: DividerOptions): Content {
  const {
    color = "#d1d5db",
    lineWidth = 0.75,
    margin = [0, 4, 0, 4],
    pageMargins,
    pageWidth = A4_PAGE_WIDTH,
  } = options;

  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        x2: pageWidth - pageMargins[0] - pageMargins[2],
        y1: 0,
        y2: 0,
        lineColor: color,
        lineWidth,
      },
    ],
    margin,
  };
}

export interface BulletLinesOptions {
  indent?: number;
  itemGap?: number;
  margin?: Margins;
  marker?: string;
  style: string;
}

export function renderBulletLines(
  items: string[] | undefined,
  options: BulletLinesOptions
): Content[] {
  const { indent = 0, itemGap = 1, margin = [0, 2, 0, 0], marker = "-", style } = options;
  if (!items || items.length === 0) return [];
  const [, topMargin, rightMargin] = getMarginValues(margin);

  return items.map((item, index) => ({
    columns: [
      { text: marker, style, width: 10 },
      { text: item, style, width: "*" },
    ],
    columnGap: 6,
    margin: [indent, index === 0 ? topMargin : itemGap, rightMargin, 0],
  }));
}

export interface SkillsTextOptions {
  groupSeparator?: string;
}

export function formatSkillsText(
  skills: ResumeSkill[] | undefined,
  options: SkillsTextOptions = {}
): string | undefined {
  if (!skills || skills.length === 0) return undefined;

  const separator = options.groupSeparator ?? ", ";
  const parts = skills
    .map((skill) => joinDefined([skill.name, skill.keywords?.join(", ")], ": "))
    .filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(separator) : undefined;
}

export interface LanguagesTextOptions {
  groupSeparator?: string;
}

export function formatLanguagesText(
  languages: ResumeLanguage[] | undefined,
  options: LanguagesTextOptions = {}
): string | undefined {
  if (!languages || languages.length === 0) return undefined;

  const separator = options.groupSeparator ?? ", ";
  const parts = languages
    .map((language) => {
      const name = language.language.trim();
      const fluency = language.fluency?.trim();

      if (!name) {
        return fluency;
      }

      return fluency ? `${name} (${fluency})` : name;
    })
    .filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(separator) : undefined;
}

export interface InterestsTextOptions {
  groupSeparator?: string;
}

export function formatInterestsText(
  interests: ResumeInterest[] | undefined,
  options: InterestsTextOptions = {}
): string | undefined {
  if (!interests || interests.length === 0) return undefined;

  const separator = options.groupSeparator ?? ", ";
  const parts = interests
    .map((interest) => joinDefined([interest.name, interest.keywords?.join(", ")], ": "))
    .filter(Boolean) as string[];

  return parts.length > 0 ? parts.join(separator) : undefined;
}

export function buildProjectMetadata(project: ResumeProject): string | undefined {
  return joinDefined(
    [project.entity, project.type, formatDateRange(project.startDate, project.endDate)],
    " | "
  );
}

export function getContentWidth(pageMargins: PdfMargin, pageWidth = A4_PAGE_WIDTH): number {
  return pageWidth - pageMargins[0] - pageMargins[2];
}

export const spacing = {
  after(bottom: number): PdfMargin {
    return [0, 0, 0, bottom];
  },
  before(top: number): PdfMargin {
    return [0, top, 0, 0];
  },
  y(top: number, bottom = top): PdfMargin {
    return [0, top, 0, bottom];
  },
};
