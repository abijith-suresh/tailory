import { EMPTY_RESUME, normalizeResume, type ResumeSchema } from "@tailory/core";
import { eq } from "drizzle-orm";

import { schema } from "../db";
import { type DataContext, PROFILE_TARGET_ID, recordChange, sameJson, type Tx } from "./context";

/** A user's profile. `updatedAt` is null until the first write. */
export type ProfileRecord = { resume: ResumeSchema; updatedAt: string | null };

export const emptyProfile = (): ResumeSchema => normalizeResume(structuredClone(EMPTY_RESUME));

/** The stored resume, or null when the user has no profile yet. Locks the row inside a write. */
export const readProfile = async (tx: Tx, userId: string, lock = false) => {
  const query = tx.select().from(schema.profile).where(eq(schema.profile.userId, userId));
  const [row] = await (lock ? query.for("update") : query);
  return row ?? null;
};

/** The profile the user's applications resolve against: empty when there is none yet. */
export const currentResume = async (tx: Tx, userId: string, lock = false) =>
  (await readProfile(tx, userId, lock))?.resume ?? emptyProfile();

/** The user's profile, empty if they haven't made one. */
export const getProfile = async (ctx: Pick<DataContext, "db" | "userId">) => {
  const row = await readProfile(ctx.db, ctx.userId);
  return {
    resume: row?.resume ?? emptyProfile(),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  } satisfies ProfileRecord;
};

/**
 * Stores `resume` as the profile, or `null` to remove it, and logs the change. Runs inside the
 * caller's transaction, which has already locked the row and checked that the value changes.
 */
export const writeProfile = async (
  tx: Tx,
  ctx: DataContext,
  before: ResumeSchema | null,
  resume: ResumeSchema | null,
  summary: string,
  undoes: string | null = null
) => {
  const now = new Date();
  if (resume) {
    await tx
      .insert(schema.profile)
      .values({ userId: ctx.userId, resume, updatedAt: now })
      .onConflictDoUpdate({ target: schema.profile.userId, set: { resume, updatedAt: now } });
  } else {
    await tx.delete(schema.profile).where(eq(schema.profile.userId, ctx.userId));
  }
  const change = await recordChange(
    tx,
    ctx,
    { targetKind: "profile", targetId: PROFILE_TARGET_ID, summary, before, after: resume, undoes },
    now
  );
  const record: ProfileRecord = { resume: resume ?? emptyProfile(), updatedAt: now.toISOString() };
  return { record, change };
};

export type ProfileUpdate = (current: ResumeSchema) => ResumeSchema;

/**
 * Changes the profile with `update`, which gets the current profile and returns the new one.
 * The result is normalized (entries, bullets and links get ids; a link's network is read from
 * its URL) and the change is logged. Nothing is written or logged when the profile comes out
 * the same.
 */
export const updateProfile = async (
  ctx: DataContext,
  update: ProfileUpdate,
  summary = "Updated the profile"
): Promise<ProfileRecord> =>
  ctx.db.transaction(async (tx) => {
    const row = await readProfile(tx, ctx.userId, true);
    const before = row?.resume ?? null;
    const next = normalizeResume(update(structuredClone(before ?? emptyProfile())));
    if (row && sameJson(before, next)) {
      return { resume: row.resume, updatedAt: row.updatedAt.toISOString() };
    }
    return (await writeProfile(tx, ctx, before, next, summary)).record;
  });

/**
 * Replaces the whole profile, as an import does. A resume without a section order keeps the
 * profile's, since an imported file has none.
 */
export const replaceProfile = (
  ctx: DataContext,
  resume: ResumeSchema,
  summary = "Replaced the profile"
) =>
  updateProfile(
    ctx,
    (current) =>
      resume.sectionOrder || !current.sectionOrder
        ? resume
        : { ...resume, sectionOrder: current.sectionOrder },
    summary
  );
