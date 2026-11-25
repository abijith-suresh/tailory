// start.serverSetup: runs to completion before the server takes requests.
import { eq } from "drizzle-orm";

import { LOCAL_USER_ID, mode } from "./config";
import { getDb, schema } from "./db";

const { db } = await getDb();

if (mode === "local") {
  // One fixed user row so foreign keys hold. No sessions, no passwords.
  const existing = await db.select().from(schema.user).where(eq(schema.user.id, LOCAL_USER_ID));
  if (!existing.length) {
    await db.insert(schema.user).values({
      id: LOCAL_USER_ID,
      name: "Local user",
      email: "local@tailory.invalid",
      emailVerified: true,
    });
    await db.insert(schema.resume).values({
      id: "r_local",
      userId: LOCAL_USER_ID,
      title: "My resume",
      data: { basics: { name: "Local user", label: "Engineer" } },
    });
  }
}
