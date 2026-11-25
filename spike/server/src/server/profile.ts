"use server";

import { getRequestEvent } from "@solidjs/web";
import { eq } from "drizzle-orm";

import { mode } from "./config";
import { getDb, schema } from "./db";

export async function getProfile() {
  const userId = getRequestEvent()?.locals.userId as string | undefined;
  if (!userId) throw new Error("Not signed in");
  const { db, driver } = await getDb();
  const [user] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
  const resumes = await db
    .select({ id: schema.resume.id, title: schema.resume.title })
    .from(schema.resume)
    .where(eq(schema.resume.userId, userId));
  return { name: user?.name ?? "?", email: user?.email ?? "?", resumes, mode, driver };
}
