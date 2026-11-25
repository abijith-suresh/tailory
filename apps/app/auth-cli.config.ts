// Only for `npm run auth:generate`: the `auth` CLI reads the Better Auth options from here to
// write src/server/db/auth-schema.ts. Every plugin that adds tables must be enabled.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { createAuth } from "./src/server/auth";
import type { Db } from "./src/server/db";

export const auth = createAuth(
  {
    secret: "auth-cli-only-auth-cli-only-auth-cli-only",
    publicUrl: "http://localhost:4413",
    emailPassword: true,
  },
  drizzle(new PGlite()) as unknown as Db
);
