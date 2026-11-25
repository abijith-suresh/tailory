import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import type { PgDatabase } from "drizzle-orm/pg-core";

import * as schema from "./schema";

export type Db = PgDatabase<any, typeof schema>;

// Migrations ship next to the build. Walk up from this module until we find
// drizzle/meta/_journal.json, so dev (src/server/db) and build (dist/server)
// both resolve it.
const findMigrations = () => {
  if (process.env.TAILORY_MIGRATIONS) return process.env.TAILORY_MIGRATIONS;
  let dir = import.meta.dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "drizzle");
    if (existsSync(path.join(candidate, "meta", "_journal.json"))) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(`drizzle migrations not found from ${import.meta.dirname}`);
};

const open = async (): Promise<{ db: Db; driver: string }> => {
  const migrationsFolder = findMigrations();
  const url = process.env.DATABASE_URL;
  const started = performance.now();
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, { max: 10, onnotice: () => {} });
    const db = drizzle(client, { schema });
    // Postgres may still be starting (compose, Railway). Retry ~30s.
    for (let attempt = 1; ; attempt++) {
      try {
        await migrate(db, { migrationsFolder });
        break;
      } catch (error) {
        const code =
          (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code;
        if (
          attempt >= 30 ||
          !["ECONNREFUSED", "57P03", "ENOTFOUND", "EAI_AGAIN"].includes(code ?? "")
        )
          throw error;
        console.log(`[db] postgres not ready (${code}), retry ${attempt}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    console.log(`[db] postgres migrated in ${Math.round(performance.now() - started)}ms`);
    return { db: db as unknown as Db, driver: "postgres" };
  }
  const dataDir = process.env.TAILORY_DATA_DIR ?? path.join(homedir(), ".tailory", "data");
  await mkdir(dataDir, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = await PGlite.create(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  console.log(`[db] pglite at ${dataDir} migrated in ${Math.round(performance.now() - started)}ms`);
  return { db: db as unknown as Db, driver: "pglite" };
};

const key = Symbol.for("tailory.db");
type G = typeof globalThis & { [key]?: Promise<{ db: Db; driver: string }> };

export const getDb = () => ((globalThis as G)[key] ??= open());
export { schema };
