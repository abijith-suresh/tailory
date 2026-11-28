import { eq } from "drizzle-orm";

import { type Db, schema } from "../db";
import { type ApplicationRecord, listApplications } from "./applications";
import type { DataContext } from "./context";
import { getProfile, type ProfileRecord } from "./profile";

/** Everything a user keeps in Tailory, in one JSON value: their profile and every application. */
export type DataExport = {
  format: "tailory-export";
  version: 1;
  exportedAt: string;
  profile: ProfileRecord;
  applications: ApplicationRecord[];
};

/** The user's profile and all their applications, archived ones too. */
export const exportEverything = async (
  ctx: Pick<DataContext, "db" | "userId">,
  now = new Date()
): Promise<DataExport> => {
  const [profile, applications] = await Promise.all([getProfile(ctx), listApplications(ctx)]);
  return {
    format: "tailory-export",
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    applications,
  };
};

/**
 * Erases what a user keeps, leaving the user: the profile, applications, the change log and the
 * agent's last call. Sign-ins and agent grants stay. Returns how many applications went.
 */
export const eraseUserData = async (db: Db, userId: string): Promise<{ applications: number }> =>
  db.transaction(async (tx) => {
    const removed = await tx
      .delete(schema.application)
      .where(eq(schema.application.userId, userId))
      .returning({ id: schema.application.id });
    await tx.delete(schema.profile).where(eq(schema.profile.userId, userId));
    await tx.delete(schema.change).where(eq(schema.change.userId, userId));
    await tx.delete(schema.mcpActivity).where(eq(schema.mcpActivity.userId, userId));
    return { applications: removed.length };
  });
