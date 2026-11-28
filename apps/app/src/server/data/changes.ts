import { normalizeApplication, normalizeResume, type ResumeSchema } from "@tailory/core";
import { and, desc, eq } from "drizzle-orm";

import { schema } from "../db";
import type { ActorKind, ChangeTargetKind, ReviewState } from "../db/schema";
import { readApplication, toApplication, writeApplication } from "./applications";
import {
  type Actor,
  type DataContext,
  DataError,
  notFound,
  PROFILE_TARGET_ID,
  sameJson,
  type Tx,
} from "./context";
import { currentResume, readProfile, writeProfile } from "./profile";
import { effectsStillShowing, type LineEffects, lineEffects } from "./review";

/** What a change was made to: the profile, or one application. */
export type ChangeTarget = { kind: "profile" } | { kind: "application"; id: string };

/** One entry in the change log. */
export type ChangeRecord = {
  id: string;
  target: ChangeTarget;
  actor: Actor;
  summary: string;
  /** The value before the change; null when the change created the target. */
  before: unknown;
  /** The value after the change; null when the change deleted the target. */
  after: unknown;
  /** The change this one undid, if it is an undo. */
  undoes: string | null;
  createdAt: string;
  /** `pending` until the user keeps or undoes an agent's change; the user's own are `kept`. */
  review: ReviewState;
  reviewedAt: string | null;
  /** Who kept or undid it. The user, for their own changes. */
  reviewer: Actor | null;
};

type Row = typeof schema.change.$inferSelect;

const toTarget = (kind: ChangeTargetKind, id: string): ChangeTarget =>
  kind === "profile" ? { kind } : { kind, id };

const toActor = (kind: ActorKind, client: string | null): Actor =>
  kind === "user" ? { kind } : { kind, client };

const toRecord = (row: Row): ChangeRecord => ({
  id: row.id,
  target: toTarget(row.targetKind, row.targetId),
  actor: toActor(row.actorKind, row.actorClient),
  summary: row.summary,
  before: row.before,
  after: row.after,
  undoes: row.undoes,
  createdAt: row.createdAt.toISOString(),
  review: row.review,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  reviewer: row.reviewerKind ? toActor(row.reviewerKind, row.reviewerClient) : null,
});

const targetId = (target: ChangeTarget) =>
  target.kind === "profile" ? PROFILE_TARGET_ID : target.id;

const ofTarget = (userId: string, target: ChangeTarget) => [
  eq(schema.change.userId, userId),
  eq(schema.change.targetKind, target.kind),
  eq(schema.change.targetId, targetId(target)),
];

/**
 * The user's changes, newest first: all of them, or those to one target, or only those in one
 * review state. `limit` caps how many come back (default 100).
 */
export const listChanges = async (
  ctx: Pick<DataContext, "db" | "userId">,
  target?: ChangeTarget,
  { limit = 100, review }: { limit?: number; review?: ReviewState } = {}
): Promise<ChangeRecord[]> => {
  const conditions = target ? ofTarget(ctx.userId, target) : [eq(schema.change.userId, ctx.userId)];
  if (review) conditions.push(eq(schema.change.review, review));
  const rows = await ctx.db
    .select()
    .from(schema.change)
    .where(and(...conditions))
    .orderBy(desc(schema.change.seq))
    .limit(limit);
  return rows.map(toRecord);
};

const readChange = async (tx: Tx, userId: string, changeId: string) => {
  const [row] = await tx
    .select()
    .from(schema.change)
    .where(and(eq(schema.change.userId, userId), eq(schema.change.id, changeId)))
    .for("update");
  if (!row) throw notFound("Change");
  return row;
};

/** Marks a change kept or undone, by the caller. */
const markReviewed = async (tx: Tx, ctx: DataContext, id: string, review: ReviewState) => {
  const [row] = await tx
    .update(schema.change)
    .set({
      review,
      reviewedAt: new Date(),
      reviewerKind: ctx.actor.kind,
      reviewerClient: ctx.actor.kind === "agent" ? ctx.actor.client : null,
    })
    .where(and(eq(schema.change.userId, ctx.userId), eq(schema.change.id, id)))
    .returning();
  return row as Row;
};

const undoSummary = (row: Row) => `Undid: ${row.summary}`;

const conflict = () =>
  new DataError("conflict", "This was changed again since; undo the later changes first");

/**
 * Puts a change's target back to its value before, logs that as a change of its own, and marks
 * the change undone. Refuses with `conflict` when the target has changed since.
 */
const undoRow = async (tx: Tx, ctx: DataContext, row: Row): Promise<Row> => {
  let change: Row;
  if (row.targetKind === "profile") {
    const current = (await readProfile(tx, ctx.userId, true))?.resume ?? null;
    if (!sameJson(current, row.after)) throw conflict();
    const restored = row.before ? normalizeResume(row.before as ResumeSchema) : null;
    ({ change } = await writeProfile(tx, ctx, current, restored, undoSummary(row), row.id));
  } else {
    const existing = await readApplication(tx, ctx.userId, row.targetId, true);
    const current = existing ? toApplication(existing) : null;
    if (!sameJson(current, row.after)) throw conflict();
    const profile = await currentResume(tx, ctx.userId);
    const restored = row.before ? normalizeApplication(row.before, profile) : null;
    ({ change } = await writeApplication(
      tx,
      ctx,
      row.targetId,
      current,
      restored,
      undoSummary(row),
      row.id
    ));
  }
  await markReviewed(tx, ctx, row.id, "undone");
  return change;
};

/**
 * Undoes change `changeId`: puts its target back to the value it had before, logs that as a
 * change of its own, so an undo can be undone too, and marks the change undone. Refuses with
 * `conflict` when the target has changed since, so an undo never throws away a later edit; undo
 * the later changes first.
 */
export const undoChange = async (ctx: DataContext, changeId: string): Promise<ChangeRecord> =>
  ctx.db.transaction(async (tx) => {
    const row = await readChange(tx, ctx.userId, changeId);
    return toRecord(await undoRow(tx, ctx, row));
  });

/**
 * Keeps an agent's change: it stops showing as pending. Keeping a kept change does nothing;
 * keeping an undone one is a `conflict`.
 */
export const keepChange = async (ctx: DataContext, changeId: string): Promise<ChangeRecord> =>
  ctx.db.transaction(async (tx) => {
    const row = await readChange(tx, ctx.userId, changeId);
    if (row.review === "undone") throw new DataError("conflict", "This change was undone");
    if (row.review === "kept") return toRecord(row);
    return toRecord(await markReviewed(tx, ctx, row.id, "kept"));
  });

const pendingRows = (tx: Tx, userId: string, target: ChangeTarget) =>
  tx
    .select()
    .from(schema.change)
    .where(and(...ofTarget(userId, target), eq(schema.change.review, "pending")))
    .orderBy(desc(schema.change.seq))
    .for("update");

/** Keeps every pending change to `target`. Returns how many it kept. */
export const keepAllChanges = async (ctx: DataContext, target: ChangeTarget): Promise<number> =>
  ctx.db.transaction(async (tx) => {
    const rows = await pendingRows(tx, ctx.userId, target);
    for (const row of rows) await markReviewed(tx, ctx, row.id, "kept");
    return rows.length;
  });

/**
 * Undoes every pending change to `target`, newest first, all or none: if one can't be undone
 * because something later changed the target, nothing is undone and it throws `conflict`.
 * Returns the undo changes it logged, newest first.
 */
export const undoAllChanges = async (
  ctx: DataContext,
  target: ChangeTarget
): Promise<ChangeRecord[]> =>
  ctx.db.transaction(async (tx) => {
    const rows = await pendingRows(tx, ctx.userId, target);
    const undone: ChangeRecord[] = [];
    for (const row of rows) undone.push(toRecord(await undoRow(tx, ctx, row)));
    return undone;
  });

/** One of an agent's changes to an application, waiting for the user, as the page shows it. */
export type PendingChange = LineEffects & {
  id: string;
  summary: string;
  /** The agent's client name, when it gave one. */
  client: string | null;
  createdAt: string;
  /** The change created the application; undoing it deletes the application. */
  created: boolean;
};

/**
 * An application's pending agent changes, newest first, with what each still shows on the page:
 * every line it reworded (item id, field, old and new text) and every entry, bullet or contact
 * detail it left out (its id, and the id of the item before it, for a margin mark). Effects the
 * user has since changed again are left out. Throws `not_found` for an application the user
 * doesn't have.
 */
export const listPendingChanges = async (
  ctx: Pick<DataContext, "db" | "userId">,
  applicationId: string
): Promise<PendingChange[]> => {
  const existing = await readApplication(ctx.db, ctx.userId, applicationId);
  if (!existing) throw notFound("Application");
  const current = toApplication(existing);
  const profile = await currentResume(ctx.db, ctx.userId);
  const rows = await ctx.db
    .select()
    .from(schema.change)
    .where(
      and(
        ...ofTarget(ctx.userId, { kind: "application", id: applicationId }),
        eq(schema.change.review, "pending")
      )
    )
    .orderBy(desc(schema.change.seq));
  return rows.map((row) => {
    const before = row.before ? normalizeApplication(row.before, profile) : null;
    const after = row.after ? normalizeApplication(row.after, profile) : null;
    const effects =
      before && after
        ? effectsStillShowing(lineEffects(before, after, profile), current, profile)
        : { reworded: [], leftOut: [], putBack: [] };
    return {
      id: row.id,
      summary: row.summary,
      client: row.actorClient,
      createdAt: row.createdAt.toISOString(),
      created: before === null,
      ...effects,
    };
  });
};

/** How many pending agent changes each application has, by id. Ids with none are left out. */
export const countPendingChanges = async (
  ctx: Pick<DataContext, "db" | "userId">
): Promise<Record<string, number>> => {
  const rows = await ctx.db
    .select({ targetId: schema.change.targetId })
    .from(schema.change)
    .where(
      and(
        eq(schema.change.userId, ctx.userId),
        eq(schema.change.targetKind, "application"),
        eq(schema.change.review, "pending")
      )
    );
  const counts: Record<string, number> = {};
  for (const { targetId: id } of rows) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
};

/** An application's pending agent changes, in brief: how many, by whom, and the newest's time. */
export type PendingSummary = {
  count: number;
  /** The agent's client name on the newest pending change, when it gave one. */
  client: string | null;
  /** When the newest pending change was made. */
  latestAt: string;
};

/** Each application's pending agent changes in brief, by id. Ids with none are left out. */
export const summarizePendingChanges = async (
  ctx: Pick<DataContext, "db" | "userId">
): Promise<Record<string, PendingSummary>> => {
  const rows = await ctx.db
    .select({
      targetId: schema.change.targetId,
      client: schema.change.actorClient,
      createdAt: schema.change.createdAt,
    })
    .from(schema.change)
    .where(
      and(
        eq(schema.change.userId, ctx.userId),
        eq(schema.change.targetKind, "application"),
        eq(schema.change.review, "pending")
      )
    )
    .orderBy(desc(schema.change.seq));
  const summaries: Record<string, PendingSummary> = {};
  for (const { targetId: id, client, createdAt } of rows) {
    const summary = summaries[id];
    if (summary) summary.count += 1;
    // Newest first, so the first row seen for an application names who and when.
    else summaries[id] = { count: 1, client, latestAt: createdAt.toISOString() };
  }
  return summaries;
};
