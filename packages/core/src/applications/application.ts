import { createId } from "../resume/ids.ts";
import {
  APPLICATION_OUTCOMES,
  APPLICATION_STATUSES,
  type Application,
  type ApplicationOutcome,
  type ApplicationStatus,
  type PageFit,
  type ResumeSectionKey,
  type Rewording,
} from "../types/application.ts";
import type { ResumeSchema } from "../types/resume.ts";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_IDS, type TemplateId } from "../types/template.ts";
import { indexProfileItems, isExcludable, type ProfileItem, readProfileText } from "./items.ts";
import { normalizeSectionOrder } from "./section-order.ts";

/** What a new application starts from. Everything else starts empty or at its default. */
export interface ApplicationDetails {
  company: string;
  role: string;
  postingUrl?: string | null;
  jobDescription?: string | null;
  templateId?: TemplateId;
  pageTarget?: number | null;
  /** The profile's section order, which the application starts from. */
  sectionOrder?: readonly ResumeSectionKey[];
}

/** A status move that can't happen, such as closing without saying how it ended. */
export class ApplicationStatusError extends Error {
  override name = "ApplicationStatusError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  return text(value) || null;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** A page target is a whole number of pages, at least one; anything else means no target. */
export function normalizePageTarget(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

/** No page target, with tightening allowed once one is set. */
export const DEFAULT_PAGE_FIT: PageFit = { pageTarget: null, autoFit: true };

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export function isApplicationOutcome(value: unknown): value is ApplicationOutcome {
  return APPLICATION_OUTCOMES.includes(value as ApplicationOutcome);
}

function normalizeTemplateId(value: unknown): TemplateId {
  return TEMPLATE_IDS.find((id) => id === value) ?? DEFAULT_TEMPLATE_ID;
}

/** A new application, still being drafted, that keeps everything in the profile. */
export function createApplication(details: ApplicationDetails, now = new Date()): Application {
  return {
    id: createId(),
    company: text(details.company),
    role: text(details.role),
    postingUrl: optionalText(details.postingUrl),
    jobDescription: optionalText(details.jobDescription),
    status: "drafting",
    outcome: null,
    offer: false,
    archived: false,
    createdAt: now.toISOString(),
    statusChangedAt: now.toISOString(),
    appliedAt: null,
    closedAt: null,
    notes: "",
    excluded: [],
    rewordings: [],
    sectionOrder: normalizeSectionOrder(details.sectionOrder),
    templateId: details.templateId ?? DEFAULT_TEMPLATE_ID,
    pageTarget: normalizePageTarget(details.pageTarget),
    autoFit: DEFAULT_PAGE_FIT.autoFit,
  };
}

/** A move on the board: a new status, how it ended, or the offer flag. Left out keeps the value. */
export interface StatusMove {
  status?: ApplicationStatus;
  /** Needed to close, unless the application already has one. Ignored unless closed. */
  outcome?: ApplicationOutcome | null;
  offer?: boolean;
}

/**
 * Moves an application and keeps its dates in step. The first move past drafting records when it
 * was applied; closing records when it closed, and reopening clears that and the outcome. Closing
 * needs an outcome and clears the offer flag. `statusChangedAt` moves whenever the status or
 * outcome does. Throws ApplicationStatusError for a closed application without an outcome.
 */
export function moveApplication(
  application: Application,
  move: StatusMove,
  now = new Date()
): Application {
  const at = now.toISOString();
  const status = move.status ?? application.status;
  const closed = status === "closed";
  const outcome = closed ? (move.outcome ?? application.outcome) : null;
  if (closed && !outcome) {
    throw new ApplicationStatusError(
      `A closed application needs an outcome: ${APPLICATION_OUTCOMES.join(", ")}.`
    );
  }
  const moved = status !== application.status || outcome !== application.outcome;
  return {
    ...application,
    status,
    outcome,
    offer: closed ? false : (move.offer ?? application.offer),
    statusChangedAt: moved ? at : application.statusChangedAt,
    appliedAt: application.appliedAt ?? (status === "drafting" ? null : at),
    closedAt: closed ? (application.closedAt ?? at) : null,
  };
}

function normalizeRewordings(value: unknown, items: Map<string, ProfileItem>): Rewording[] {
  if (!Array.isArray(value)) return [];

  const byKey = new Map<string, Rewording>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const { itemId, field, text: wording, baseText } = entry;
    if (typeof itemId !== "string" || typeof field !== "string" || typeof wording !== "string") {
      continue;
    }
    const profileText = readProfileText(items, itemId, field);
    if (profileText === null) continue;

    byKey.set(`${itemId}\u0000${field}`, {
      itemId,
      field,
      text: wording,
      baseText: typeof baseText === "string" ? baseText : profileText,
    });
  }
  return [...byKey.values()];
}

/**
 * Cleans an application read from storage or written by an agent: fills defaults, drops fields
 * of the wrong type, and drops references to entries, bullets, links and fields the profile
 * doesn't have. A rewording without `baseText` takes the profile's current text.
 */
export function normalizeApplication(value: unknown, profile: ResumeSchema): Application {
  const source = isRecord(value) ? value : {};
  const items = indexProfileItems(profile);
  const status = isApplicationStatus(source.status) ? source.status : "drafting";
  const createdAt = isoDate(source.createdAt) ?? new Date().toISOString();
  const excluded = Array.isArray(source.excluded)
    ? source.excluded.filter(
        (id): id is string => typeof id === "string" && isExcludable(items.get(id))
      )
    : [];

  return {
    id: text(source.id) || createId(),
    company: text(source.company),
    role: text(source.role),
    postingUrl: optionalText(source.postingUrl),
    jobDescription: optionalText(source.jobDescription),
    status,
    // A closed application always has an outcome; stored data without one reads as withdrawn.
    outcome:
      status === "closed"
        ? isApplicationOutcome(source.outcome)
          ? source.outcome
          : "withdrawn"
        : null,
    offer: status !== "closed" && source.offer === true,
    archived: source.archived === true,
    createdAt,
    statusChangedAt: isoDate(source.statusChangedAt) ?? createdAt,
    appliedAt: isoDate(source.appliedAt),
    closedAt: isoDate(source.closedAt),
    notes: typeof source.notes === "string" ? source.notes : "",
    excluded: [...new Set(excluded)],
    rewordings: normalizeRewordings(source.rewordings, items),
    sectionOrder: normalizeSectionOrder(source.sectionOrder),
    templateId: normalizeTemplateId(source.templateId),
    pageTarget: normalizePageTarget(source.pageTarget),
    autoFit: source.autoFit !== false,
  };
}
