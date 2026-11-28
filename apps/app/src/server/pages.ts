// What the Applications and Application screens read and write, for one user. The server
// functions in ./functions.ts check who is calling and hand the work here, so this runs in tests
// without a request.

import {
  APPLICATION_STATUSES,
  type Application,
  BASICS_ITEM_ID,
  ENTRY_SECTIONS,
  type EntrySection,
  findRewording,
  indexProfileItems,
  isExcludable,
  RESUME_SECTION_KEYS,
  ResumeExportValidationError,
  type ResumeSchema,
  type ResumeSectionKey,
  readProfileText,
  sameText,
  TEMPLATE_IDS,
  TEMPLATE_OPTIONS,
} from "@tailory/core";
import { z } from "zod";

import {
  type ApplicationChanges,
  type ApplicationEdit,
  type ApplicationRecord,
  type ChangeRecord,
  createApplication,
  type DataContext,
  DataError,
  getApplication,
  getProfile,
  listApplications,
  listChanges,
  undoChange,
  updateApplication,
} from "./data";
import { fitApplicationResult, type PageResult, printApplication } from "./render";

type ReadContext = Pick<DataContext, "db" | "userId">;

// ── The list ─────────────────────────────────────────────────────────────────────────────────

export type ApplicationRow = Pick<
  ApplicationRecord,
  "id" | "company" | "role" | "status" | "archived" | "updatedAt"
>;

/** The rows of the home screen, most recently changed first. Archived ones only when asked. */
export const listApplicationRows = async (
  ctx: ReadContext,
  options: { search?: string; showArchived?: boolean } = {}
): Promise<ApplicationRow[]> => {
  const applications = await listApplications(ctx, {
    search: options.search?.slice(0, 200),
    archived: options.showArchived ? undefined : false,
  });
  return applications.map(({ id, company, role, status, archived, updatedAt }) => ({
    id,
    company,
    role,
    status,
    archived,
    updatedAt,
  }));
};

/** The home screen: its rows, and whether the user has any application at all, archived too. */
export const getHomeView = async (
  ctx: ReadContext,
  options: { search?: string; showArchived?: boolean } = {}
) => {
  const rows = await listApplicationRows(ctx, options);
  const hasAny = rows.length > 0 || (await listApplications(ctx)).length > 0;
  return { rows, hasAny };
};

// Fitting measures the resume with pdfmake, ~100 ms or more each, so the list's page results are
// kept per process. The key holds both change times, so an edit to either misses the cache.
const PAGE_CACHE_SIZE = 500;
const pageCache = new Map<string, PageResult>();

const cachedPage = async (
  profile: { resume: ResumeSchema; updatedAt: string | null },
  application: ApplicationRecord
) => {
  const key = `${application.id}|${application.updatedAt}|${profile.updatedAt ?? ""}`;
  const hit = pageCache.get(key);
  if (hit) {
    // Refresh its place, so the cache drops the least recently used.
    pageCache.delete(key);
    pageCache.set(key, hit);
    return hit;
  }
  const { page } = await fitApplicationResult(profile.resume, application);
  pageCache.set(key, page);
  if (pageCache.size > PAGE_CACHE_SIZE) {
    pageCache.delete(pageCache.keys().next().value as string);
  }
  return page;
};

/** The page result of each of the user's applications in `ids`; ids they don't have are left out. */
export const listPageResults = async (
  ctx: ReadContext,
  ids: readonly string[]
): Promise<Record<string, PageResult>> => {
  const wanted = new Set(ids.slice(0, 500));
  if (wanted.size === 0) return {};
  const [profile, applications] = await Promise.all([getProfile(ctx), listApplications(ctx)]);
  const results: Record<string, PageResult> = {};
  for (const application of applications) {
    if (wanted.has(application.id))
      results[application.id] = await cachedPage(profile, application);
  }
  return results;
};

// ── One application ──────────────────────────────────────────────────────────────────────────

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Summary",
  work: "Experience",
  volunteer: "Volunteering",
  education: "Education",
  awards: "Awards",
  publications: "Publications",
  skills: "Skills",
  languages: "Languages",
  interests: "Interests",
  projects: "Projects",
  references: "References",
  certificates: "Certificates",
};

/** One line of text the application can reword. */
export type LineView = {
  itemId: string;
  field: string;
  /** What prints: the application's wording, or the profile's. */
  text: string;
  /** The profile's text now. */
  profileText: string;
  /** The profile text the rewording was based on, when there is one. */
  baseText: string | null;
  /** The profile text has changed since the rewording was made. */
  stale: boolean;
};

export type BulletView = LineView & { id: string; included: boolean };

export type EntryView = {
  id: string;
  title: string;
  /** Dates or other detail under the title; may be empty. */
  detail: string;
  included: boolean;
  /** Text fields of the entry itself that print as running text, such as a summary. */
  lines: LineView[];
  bullets: BulletView[];
};

export type SectionView = {
  /** The section key, under the name lists key rows by. */
  id: ResumeSectionKey;
  key: ResumeSectionKey;
  label: string;
  entries: EntryView[];
  /** Lines that belong to the section rather than an entry: the headline and summary. */
  lines: LineView[];
};

export type ChangeView = {
  id: string;
  /** "You", or the agent's name. */
  who: string;
  byAgent: boolean;
  summary: string;
  /** False for the change that created the application: undoing it would delete it. */
  undoable: boolean;
  createdAt: string;
};

export type ApplicationView = {
  application: ApplicationRecord;
  page: PageResult | null;
  /** The resume as it prints, base64, or null when there is nothing to print. */
  pdf: string | null;
  /** Why there is no PDF, in words. */
  printError: string | null;
  staleCount: number;
  sections: SectionView[];
  /** Sections with something to print, in the application's order. */
  order: { id: ResumeSectionKey; key: ResumeSectionKey; label: string }[];
  templates: { id: string; label: string; description: string }[];
  changes: ChangeView[];
  profileEmpty: boolean;
};

type AnyEntry = Record<string, unknown> & {
  id: string;
  highlights?: { id: string; text: string }[];
};

const entriesOf = (profile: ResumeSchema, section: EntrySection) =>
  (profile[section] ?? []) as unknown as AnyEntry[];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const joined = (separator: string, ...parts: unknown[]) =>
  parts.map(str).filter(Boolean).join(separator);

const entryTitle = (section: EntrySection, entry: AnyEntry) => {
  switch (section) {
    case "work":
      return joined(", ", entry.position, entry.name);
    case "volunteer":
      return joined(", ", entry.position, entry.organization);
    case "education":
      return joined(", ", joined(" in ", entry.studyType, entry.area), entry.institution);
    case "awards":
      return str(entry.title);
    case "languages":
      return joined(", ", entry.language, entry.fluency);
    case "skills":
    case "interests":
      return joined(": ", entry.name, (entry.keywords as string[] | undefined)?.join(", "));
    default:
      return str(entry.name);
  }
};

const entryDetail = (entry: AnyEntry) =>
  joined(" – ", entry.startDate, entry.endDate) ||
  str(entry.date) ||
  str(entry.releaseDate) ||
  str(entry.issuer) ||
  str(entry.publisher);

const lineOf = (
  application: Application,
  itemId: string,
  field: string,
  profileText: string
): LineView => {
  const rewording = findRewording(application, itemId, field);
  return {
    itemId,
    field,
    text: rewording?.text ?? profileText,
    profileText,
    baseText: rewording?.baseText ?? null,
    stale: rewording ? !sameText(profileText, rewording.baseText) : false,
  };
};

/** The profile as a tree of what this application keeps and how it words it. */
export const buildSections = (profile: ResumeSchema, application: Application): SectionView[] => {
  const excluded = new Set(application.excluded);
  const sections: SectionView[] = [];
  for (const key of application.sectionOrder) {
    if (key === "summary") {
      const lines = (["label", "summary"] as const)
        .filter((field) => str(profile.basics[field]))
        .map((field) => lineOf(application, BASICS_ITEM_ID, field, profile.basics[field] ?? ""));
      if (lines.length > 0)
        sections.push({ id: key, key, label: SECTION_LABELS[key], entries: [], lines });
      continue;
    }
    const entries = entriesOf(profile, key);
    if (entries.length === 0) continue;
    sections.push({
      id: key,
      key,
      label: SECTION_LABELS[key],
      lines: [],
      entries: entries.map((entry) => ({
        id: entry.id,
        title: entryTitle(key, entry) || "Untitled",
        detail: entryDetail(entry),
        included: !excluded.has(entry.id),
        lines: str(entry.summary)
          ? [lineOf(application, entry.id, "summary", String(entry.summary))]
          : [],
        bullets: (entry.highlights ?? []).map((highlight) => ({
          ...lineOf(application, highlight.id, "text", highlight.text),
          id: highlight.id,
          included: !excluded.has(highlight.id),
        })),
      })),
    });
  }
  return sections;
};

const toChangeView = (change: ChangeRecord): ChangeView => ({
  id: change.id,
  who: change.actor.kind === "user" ? "You" : (change.actor.client ?? "An agent"),
  byAgent: change.actor.kind === "agent",
  summary: change.summary,
  undoable: change.before !== null,
  createdAt: change.createdAt,
});

/** Everything the Application screen shows. Null when the user has no application `id`. */
export const getApplicationView = async (
  ctx: ReadContext,
  id: string
): Promise<ApplicationView | null> => {
  let application: ApplicationRecord;
  try {
    application = await getApplication(ctx, id);
  } catch (error) {
    if (error instanceof DataError) return null;
    throw error;
  }
  const [{ resume: profile, updatedAt }, changes] = await Promise.all([
    getProfile(ctx),
    listChanges(ctx, { kind: "application", id }, { limit: 50 }),
  ]);
  let fitted: Awaited<ReturnType<typeof fitApplicationResult>>;
  let pdf: string | null = null;
  let printError: string | null = null;
  try {
    const printed = await printApplication(profile, application);
    fitted = printed;
    pdf = Buffer.from(printed.pdf).toString("base64");
  } catch (error) {
    if (!(error instanceof ResumeExportValidationError)) throw error;
    printError = error.message;
    fitted = await fitApplicationResult(profile, application);
  }
  const sections = buildSections(profile, application);
  const printed = new Set(
    sections
      .filter(
        (section) => section.lines.length > 0 || section.entries.some((entry) => entry.included)
      )
      .map((section) => section.key)
  );
  return {
    application,
    page: pdf ? fitted.page : null,
    pdf,
    printError,
    staleCount: fitted.staleRewordings.length,
    sections,
    order: application.sectionOrder
      .filter((key) => printed.has(key))
      .map((key) => ({ id: key, key, label: SECTION_LABELS[key] })),
    templates: TEMPLATE_OPTIONS.map(({ id, label, description }) => ({ id, label, description })),
    changes: changes.map(toChangeView),
    profileEmpty: updatedAt === null,
  };
};

// ── Writes ───────────────────────────────────────────────────────────────────────────────────

const text = (max: number) => z.string().max(max);

/** What the New application form sends. */
export const newApplicationInput = z.object({
  company: text(200).trim().min(1, "Enter the company."),
  role: text(200).trim().min(1, "Enter the role."),
  postingUrl: z
    .union([z.literal(""), z.url({ protocol: /^https?$/, error: "Enter a web address." })])
    .optional(),
  jobDescription: text(100_000).optional(),
});

/** One edit from the Application screen. Each saves at once and is logged on its own. */
export const applicationEditInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("details"),
    company: text(200).trim().min(1).optional(),
    role: text(200).trim().min(1).optional(),
    postingUrl: z
      .union([z.literal(""), z.url({ protocol: /^https?$/ })])
      .nullable()
      .optional(),
    jobDescription: text(100_000).nullable().optional(),
    notes: text(20_000).optional(),
  }),
  z.object({ type: z.literal("status"), status: z.enum(APPLICATION_STATUSES) }),
  z.object({ type: z.literal("archive"), archived: z.boolean() }),
  z.object({ type: z.literal("include"), itemId: z.string(), included: z.boolean() }),
  z.object({
    type: z.literal("reword"),
    itemId: z.string(),
    field: z.string(),
    text: text(2_000),
  }),
  z.object({
    type: z.literal("move-section"),
    section: z.enum(RESUME_SECTION_KEYS),
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({ type: z.literal("template"), templateId: z.enum(TEMPLATE_IDS) }),
  z.object({
    type: z.literal("fit"),
    pageTarget: z.number().int().min(1).max(20).nullable().optional(),
    autoFit: z.boolean().optional(),
  }),
]);

export type ApplicationEditInput = z.infer<typeof applicationEditInput>;

/** A result the page can show: done, or what went wrong in words. */
export type WriteResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

const quote = (value: string) => {
  const flat = value.replace(/\s+/g, " ").trim();
  return `“${flat.length > 48 ? `${flat.slice(0, 47)}…` : flat}”`;
};

const itemName = (profile: ResumeSchema, itemId: string) => {
  for (const section of ENTRY_SECTIONS) {
    for (const entry of entriesOf(profile, section)) {
      if (entry.id === itemId) return quote(entryTitle(section, entry) || "Untitled");
      const bullet = entry.highlights?.find((highlight) => highlight.id === itemId);
      if (bullet) return quote(bullet.text);
    }
  }
  return "an item";
};

/**
 * Turns one edit into the changes to make to the application as it is in the write, with a
 * summary for the change log.
 */
export const editToChanges =
  (edit: ApplicationEditInput): ApplicationEdit =>
  (current, profile) => {
    switch (edit.type) {
      case "details": {
        const { type: _, ...fields } = edit;
        const changes: ApplicationChanges = { ...fields };
        if (fields.postingUrl === "") changes.postingUrl = null;
        return { changes };
      }
      case "status":
        return { changes: { status: edit.status } };
      case "archive":
        return { changes: { archived: edit.archived } };
      case "include": {
        const items = indexProfileItems(profile);
        if (!isExcludable(items.get(edit.itemId))) return { changes: {} };
        const excluded = current.excluded.filter((id) => id !== edit.itemId);
        if (!edit.included) excluded.push(edit.itemId);
        const name = itemName(profile, edit.itemId);
        return {
          changes: { excluded },
          summary: edit.included ? `Put back ${name}` : `Left out ${name}`,
        };
      }
      case "reword": {
        const items = indexProfileItems(profile);
        const profileText = readProfileText(items, edit.itemId, edit.field);
        if (profileText === null) return { changes: {} };
        const others = current.rewordings.filter(
          (rewording) => !(rewording.itemId === edit.itemId && rewording.field === edit.field)
        );
        // Empty, or the profile's own words: go back to the profile.
        if (!edit.text.trim() || sameText(edit.text, profileText)) {
          return {
            changes: { rewordings: others },
            summary: `Went back to the profile's wording of ${quote(profileText)}`,
          };
        }
        return {
          changes: {
            rewordings: [
              ...others,
              {
                itemId: edit.itemId,
                field: edit.field,
                text: edit.text.trim(),
                baseText: profileText,
              },
            ],
          },
          summary: `Reworded ${quote(profileText)}`,
        };
      }
      case "move-section": {
        // Moves past sections with nothing to print, so each press visibly moves it one place.
        const resumeHas = (key: ResumeSectionKey) =>
          key === "summary"
            ? Boolean(str(profile.basics.summary) || str(profile.basics.label))
            : (profile[key] ?? []).length > 0;
        const order = [...current.sectionOrder];
        const from = order.indexOf(edit.section);
        let to = from + edit.direction;
        while (to >= 0 && to < order.length && !resumeHas(order[to] as ResumeSectionKey)) {
          to += edit.direction;
        }
        if (from < 0 || to < 0 || to >= order.length) return { changes: {} };
        order.splice(from, 1);
        order.splice(to, 0, edit.section);
        return {
          changes: { sectionOrder: order },
          summary: `Moved ${SECTION_LABELS[edit.section]} ${edit.direction < 0 ? "up" : "down"}`,
        };
      }
      case "template": {
        const label = TEMPLATE_OPTIONS.find((option) => option.id === edit.templateId)?.label;
        return {
          changes: { templateId: edit.templateId },
          summary: `Switched to the ${label ?? edit.templateId} template`,
        };
      }
      case "fit": {
        const changes: ApplicationChanges = {};
        const said: string[] = [];
        if (edit.pageTarget !== undefined && edit.pageTarget !== current.pageTarget) {
          changes.pageTarget = edit.pageTarget;
          said.push(
            edit.pageTarget === null
              ? "Removed the page target"
              : `Set the page target to ${edit.pageTarget} ${edit.pageTarget === 1 ? "page" : "pages"}`
          );
        }
        if (edit.autoFit !== undefined && edit.autoFit !== current.autoFit) {
          changes.autoFit = edit.autoFit;
          said.push(edit.autoFit ? "Turned tightening on" : "Turned tightening off");
        }
        return { changes, summary: said.join("; ") || undefined };
      }
    }
  };

const failure = (error: unknown): { ok: false; error: string } => {
  if (error instanceof DataError) {
    return {
      ok: false,
      error:
        error.code === "conflict"
          ? "Can't undo this: it was changed again since. Undo the later changes first."
          : "This application no longer exists.",
    };
  }
  throw error;
};

export const createApplicationFromForm = async (
  ctx: DataContext,
  input: unknown
): Promise<WriteResult<{ id: string }>> => {
  const parsed = newApplicationInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const { company, role, postingUrl, jobDescription } = parsed.data;
  const record = await createApplication(ctx, {
    company,
    role,
    postingUrl: postingUrl || null,
    jobDescription: jobDescription?.trim() || null,
  });
  return { ok: true, value: { id: record.id } };
};

export const editApplication = async (
  ctx: DataContext,
  id: string,
  input: unknown
): Promise<WriteResult> => {
  const parsed = applicationEditInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That change isn't valid." };
  try {
    await updateApplication(ctx, id, editToChanges(parsed.data));
    return { ok: true, value: undefined };
  } catch (error) {
    return failure(error);
  }
};

/** Undoes one of this application's changes. */
export const undoApplicationChange = async (
  ctx: DataContext,
  applicationId: string,
  changeId: string
): Promise<WriteResult> => {
  const [change] = (await listChanges(ctx, { kind: "application", id: applicationId })).filter(
    (entry) => entry.id === changeId
  );
  if (!change) return { ok: false, error: "That change is no longer in this application's log." };
  try {
    await undoChange(ctx, changeId);
    return { ok: true, value: undefined };
  } catch (error) {
    return failure(error);
  }
};
