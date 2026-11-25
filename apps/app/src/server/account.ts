import { eq } from "drizzle-orm";

import { type Db, ensureLocalUser, LOCAL_USER, schema } from "./db";

/**
 * Deletes a user and everything they own. Sessions, linked sign-ins, OAuth grants and tokens go
 * with the user row through `on delete cascade`; tables added later must cascade the same way.
 * Local mode's user is created again, empty, so the app keeps working.
 */
export const deleteUser = async (db: Db, userId: string) => {
  await db.delete(schema.user).where(eq(schema.user.id, userId));
  if (userId === LOCAL_USER.id) await ensureLocalUser(db);
};
