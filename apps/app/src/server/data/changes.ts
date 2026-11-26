import { normalizeApplication, normalizeResume, type ResumeSchema } from "@tailory/core";
import { and, desc, eq } from "drizzle-orm";

import { schema } from "../db";
import type { ActorKind, ChangeTargetKind } from "../db/schema";
import { readApplication, toApplication, writeApplication } from "./applications";
import { type DataContext, DataError, notFound, PROFILE_TARGET_ID, sameJson } from "./context";
import { currentResume, readProfile, writeProfile } from "./profile";

/** What a change was made to: the profile, or one application. */
export type ChangeTarget = { kind: "profile" } | { kind: "application"; id: string };

/** One entry in the change log. */
export type ChangeRecord = {
  id: string;
  target: ChangeTarget;
  actor: { kind: ActorKind; client: string | null };
  summary: string;
  /** The value before the change; null when the change created the target. */
  before: unknown;
  /** The value after the change; null when the change deleted the target. */
  after: unknown;
  /** The change this one undid, if it is an undo. */
  undoes: string | null;
  createdAt: string;
};

type Row = typeof schema.change.$inferSelect;

const toTarget = (kind: ChangeTargetKind, id: string): ChangeTarget =>
  kind === "profile" ? { kind } : { kind, id };

const toRecord = (row: Row): ChangeRecord => ({
  id: row.id,
  target: toTarget(row.targetKind, row.targetId),
  actor: { kind: row.actorKind, client: row.actorClient },
  summary: row.summary,
  before: row.before,
  after: row.after,
  undoes: row.undoes,
  createdAt: row.createdAt.toISOString(),
});

const targetId = (target: ChangeTarget) =>
  target.kind === "profile" ? PROFILE_TARGET_ID : target.id;

/**
 * The user's changes, newest first: all of them, or those to one target. `limit` caps how many
 * come back (default 100).
 */
export const listChanges = async (
  ctx: Pick<DataContext, "db" | "userId">,
  target?: ChangeTarget,
  { limit = 100 }: { limit?: number } = {}
): Promise<ChangeRecord[]> => {
  const conditions = [eq(schema.change.userId, ctx.userId)];
  if (target) {
    conditions.push(
      eq(schema.change.targetKind, target.kind),
      eq(schema.change.targetId, targetId(target))
    );
  }
  const rows = await ctx.db
    .select()
    .from(schema.change)
    .where(and(...conditions))
    .orderBy(desc(schema.change.seq))
    .limit(limit);
  return rows.map(toRecord);
};

const undoSummary = (row: Row) => `Undid: ${row.summary}`;

/**
 * Undoes change `changeId`: puts its target back to the value it had before, and logs that as a
 * change of its own, so an undo can be undone too. Refuses with `conflict` when the target has
 * changed since, so an undo never throws away a later edit; undo the later changes first.
 */
export const undoChange = async (ctx: DataContext, changeId: string): Promise<ChangeRecord> =>
  ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.change)
      .where(and(eq(schema.change.userId, ctx.userId), eq(schema.change.id, changeId)));
    if (!row) throw notFound("Change");

    const conflict = () =>
      new DataError("conflict", "This was changed again since; undo the later changes first");

    if (row.targetKind === "profile") {
      const current = (await readProfile(tx, ctx.userId, true))?.resume ?? null;
      if (!sameJson(current, row.after)) throw conflict();
      const restored = row.before ? normalizeResume(row.before as ResumeSchema) : null;
      const { change } = await writeProfile(tx, ctx, current, restored, undoSummary(row), row.id);
      return toRecord(change);
    }
    const existing = await readApplication(tx, ctx.userId, row.targetId, true);
    const current = existing ? toApplication(existing) : null;
    if (!sameJson(current, row.after)) throw conflict();
    const profile = await currentResume(tx, ctx.userId);
    const restored = row.before ? normalizeApplication(row.before, profile) : null;
    const { change } = await writeApplication(
      tx,
      ctx,
      row.targetId,
      current,
      restored,
      undoSummary(row),
      row.id
    );
    return toRecord(change);
  });
