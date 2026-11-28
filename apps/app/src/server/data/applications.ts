import {
  type Application,
  type ApplicationDetails,
  type ApplicationStatus,
  createApplication as newApplication,
  normalizeApplication,
  type ResumeSchema,
  type ResumeSectionKey,
  type Rewording,
  setApplicationStatus,
  type TemplateId,
} from "@tailory/core";
import { and, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { schema } from "../db";
import { type DataContext, notFound, recordChange, sameJson, type Tx } from "./context";
import { currentResume } from "./profile";

/** An application as stored, with when it last changed. */
export type ApplicationRecord = Application & { updatedAt: string };

type Row = typeof schema.application.$inferSelect;

export const toApplication = (row: Row): Application => ({
  ...row.data,
  id: row.id,
  company: row.company,
  role: row.role,
  status: row.status,
  archived: row.archived,
  createdAt: row.createdAt.toISOString(),
});

const toRecord = (row: Row): ApplicationRecord => ({
  ...toApplication(row),
  updatedAt: row.updatedAt.toISOString(),
});

const toRow = (userId: string, application: Application, updatedAt: Date) => {
  const { id, company, role, status, archived, createdAt, ...data } = application;
  return {
    id,
    userId,
    company,
    role,
    status,
    archived,
    createdAt: new Date(createdAt),
    updatedAt,
    data,
  };
};

const owned = (userId: string, id: string) =>
  and(eq(schema.application.userId, userId), eq(schema.application.id, id));

/** The user's application `id`, or null. Locks the row inside a write. */
export const readApplication = async (tx: Tx, userId: string, id: string, lock = false) => {
  const query = tx.select().from(schema.application).where(owned(userId, id));
  const [row] = await (lock ? query.for("update") : query);
  return row ?? null;
};

/**
 * Stores `application`, or removes application `id` when it is null, and logs the change. Runs
 * inside the caller's transaction, which has already locked the row and checked that it changes.
 */
export const writeApplication = async (
  tx: Tx,
  ctx: DataContext,
  id: string,
  before: Application | null,
  application: Application | null,
  summary: string,
  undoes: string | null = null
) => {
  const now = new Date();
  let row: Row | undefined;
  if (application) {
    const values = toRow(ctx.userId, application, now);
    [row] = before
      ? await tx.update(schema.application).set(values).where(owned(ctx.userId, id)).returning()
      : await tx.insert(schema.application).values(values).returning();
  } else {
    await tx.delete(schema.application).where(owned(ctx.userId, id));
  }
  const change = await recordChange(
    tx,
    ctx,
    { targetKind: "application", targetId: id, summary, before, after: application, undoes },
    now
  );
  return { record: row ? toRecord(row) : null, change };
};

const label = (application: Application) =>
  [application.company, application.role].filter(Boolean).join(", ") || "an application";

export type ApplicationFilter = {
  /** Only these statuses. */
  status?: ApplicationStatus | ApplicationStatus[];
  /** Only archived (true) or only active (false) applications; both when omitted. */
  archived?: boolean;
  /** Text the company or role contains, case ignored. */
  search?: string;
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/** The user's applications, most recently changed first. */
export const listApplications = async (
  ctx: Pick<DataContext, "db" | "userId">,
  filter: ApplicationFilter = {}
): Promise<ApplicationRecord[]> => {
  const conditions: (SQL | undefined)[] = [eq(schema.application.userId, ctx.userId)];
  if (filter.status !== undefined) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (statuses.length === 0) return [];
    conditions.push(inArray(schema.application.status, statuses));
  }
  if (filter.archived !== undefined) {
    conditions.push(eq(schema.application.archived, filter.archived));
  }
  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    conditions.push(
      or(ilike(schema.application.company, pattern), ilike(schema.application.role, pattern))
    );
  }
  const rows = await ctx.db
    .select()
    .from(schema.application)
    .where(and(...conditions))
    .orderBy(desc(schema.application.updatedAt), desc(schema.application.createdAt));
  return rows.map(toRecord);
};

/** The user's application `id`. Throws `not_found` for an id the user doesn't have. */
export const getApplication = async (
  ctx: Pick<DataContext, "db" | "userId">,
  id: string
): Promise<ApplicationRecord> => {
  const row = await readApplication(ctx.db, ctx.userId, id);
  if (!row) throw notFound("Application");
  return toRecord(row);
};

/** A new application, drafting, that keeps everything in the profile. */
export const createApplication = async (
  ctx: DataContext,
  details: ApplicationDetails,
  summary?: string
): Promise<ApplicationRecord> =>
  ctx.db.transaction(async (tx) => {
    const profile = await currentResume(tx, ctx.userId);
    const application = normalizeApplication(newApplication(details), profile);
    const { record } = await writeApplication(
      tx,
      ctx,
      application.id,
      null,
      application,
      summary ?? `Created ${label(application)}`
    );
    return record as ApplicationRecord;
  });

/** What an update can change. Fields left out keep their value; `id` and `createdAt` never change. */
export type ApplicationChanges = {
  company?: string;
  role?: string;
  postingUrl?: string | null;
  jobDescription?: string | null;
  /** Moves the status and keeps `appliedAt` and `closedAt` in step, unless those are given too. */
  status?: ApplicationStatus;
  archived?: boolean;
  appliedAt?: string | null;
  closedAt?: string | null;
  notes?: string;
  excluded?: string[];
  rewordings?: Rewording[];
  sectionOrder?: ResumeSectionKey[];
  templateId?: TemplateId;
  pageTarget?: number | null;
  autoFit?: boolean;
};

const FIELD_NAMES: Record<keyof ApplicationChanges, string> = {
  company: "company",
  role: "role",
  postingUrl: "posting URL",
  jobDescription: "job description",
  status: "status",
  archived: "archived",
  appliedAt: "applied date",
  closedAt: "closed date",
  notes: "notes",
  excluded: "left-out items",
  rewordings: "wording",
  sectionOrder: "section order",
  templateId: "template",
  pageTarget: "page target",
  autoFit: "fitting",
};

const STATUS_FIELDS = new Set<string>(["status", "appliedAt", "closedAt"]);

const describeChanges = (before: Application, after: Application) => {
  const changed = (Object.keys(FIELD_NAMES) as (keyof ApplicationChanges)[]).filter(
    (key) => !sameJson(before[key], after[key])
  );
  if (changed.length === 1 && changed[0] === "archived") {
    return `${after.archived ? "Archived" : "Unarchived"} ${label(after)}`;
  }
  if (changed.includes("status") && changed.every((key) => STATUS_FIELDS.has(key))) {
    return `Moved ${label(after)} to ${after.status}`;
  }
  return `Changed the ${changed.map((key) => FIELD_NAMES[key]).join(", ")} of ${label(after)}`;
};

/** Applies `changes` to an application, normalized against `profile`. */
export const applyChanges = (
  current: Application,
  changes: ApplicationChanges,
  profile: ResumeSchema,
  now = new Date()
): Application => {
  const { status, appliedAt, closedAt, ...rest } = changes;
  let next: Application = { ...current, ...rest, id: current.id, createdAt: current.createdAt };
  if (status !== undefined && status !== current.status) {
    next = setApplicationStatus(next, status, now);
  }
  if (appliedAt !== undefined) next.appliedAt = appliedAt;
  if (closedAt !== undefined) next.closedAt = closedAt;
  return normalizeApplication(next, profile);
};

/**
 * Changes worked out from the application as it is inside the write, for edits that depend on
 * the current value (leave one more item out, move a section). Returns the changes and, if it
 * wants one, the summary to log.
 */
export type ApplicationEdit = (
  current: Application,
  profile: ResumeSchema
) => { changes: ApplicationChanges; summary?: string };

/**
 * Changes the user's application `id` and logs the change. `changes` may be an edit that reads
 * the current application, so concurrent writes never undo each other. Returns it unchanged,
 * with nothing logged, when the changes make no difference.
 */
export const updateApplication = async (
  ctx: DataContext,
  id: string,
  changes: ApplicationChanges | ApplicationEdit,
  summary?: string
): Promise<ApplicationRecord> =>
  ctx.db.transaction(async (tx) => {
    const row = await readApplication(tx, ctx.userId, id, true);
    if (!row) throw notFound("Application");
    const before = toApplication(row);
    const profile = await currentResume(tx, ctx.userId);
    const edit =
      typeof changes === "function" ? changes(before, profile) : { changes, summary: undefined };
    const after = applyChanges(before, edit.changes, profile);
    if (sameJson(before, after)) return toRecord(row);
    const { record } = await writeApplication(
      tx,
      ctx,
      id,
      before,
      after,
      summary ?? edit.summary ?? describeChanges(before, after)
    );
    return record as ApplicationRecord;
  });

/** Deletes the user's application `id`. Its change log stays, so the delete can be undone. */
export const deleteApplication = async (
  ctx: DataContext,
  id: string,
  summary?: string
): Promise<void> =>
  ctx.db.transaction(async (tx) => {
    const row = await readApplication(tx, ctx.userId, id, true);
    if (!row) throw notFound("Application");
    const before = toApplication(row);
    await writeApplication(tx, ctx, id, before, null, summary ?? `Deleted ${label(before)}`);
  });
