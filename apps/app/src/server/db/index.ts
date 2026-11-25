import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { Config } from "../config";
import { acquireLock } from "../lock";
import { retryWhileNotReady } from "./retry";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Database = {
  db: Db;
  driver: "pglite" | "postgres";
  close: () => Promise<void>;
};

export type OpenOptions = {
  /** Folder holding the generated migrations. Found next to the code when omitted. */
  migrationsFolder?: string;
  /** How long to wait for Postgres to accept connections. */
  connectTimeoutMs?: number;
  log?: (message: string) => void;
};

/** Where PGlite keeps its files inside the data dir. */
export const pgliteFolder = (dataDir: string) => path.join(dataDir, "pglite");

// Migrations ship in the package's drizzle/ folder. Walk up from this module so the source tree
// (src/server/db) and the build (dist/server, or a chunk below it) both find it.
const findMigrations = (): string => {
  let dir = import.meta.dirname;
  for (let depth = 0; depth < 6; depth++) {
    const candidate = path.join(dir, "drizzle");
    if (existsSync(path.join(candidate, "meta", "_journal.json"))) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(
    `Tailory's database migrations are missing (searched up from ${import.meta.dirname})`
  );
};

const seed = async (db: Db) => {
  await db
    .insert(schema.appMeta)
    .values({ key: "install_id", value: randomUUID() })
    .onConflictDoNothing();
};

const openPostgres = async (url: string, migrationsFolder: string, options: OpenOptions) => {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  try {
    await retryWhileNotReady(() => migrate(db, { migrationsFolder }), {
      timeoutMs: options.connectTimeoutMs ?? 30_000,
      intervalMs: 1_000,
      onRetry: (_error, attempt) =>
        options.log?.(`Waiting for Postgres to accept connections (attempt ${attempt})`),
    });
    await seed(db);
  } catch (error) {
    await client.end({ timeout: 5 });
    throw error;
  }
  return {
    db: db as unknown as Db,
    driver: "postgres" as const,
    close: () => client.end({ timeout: 5 }),
  };
};

const openPglite = async (dataDir: string, migrationsFolder: string) => {
  const folder = pgliteFolder(dataDir);
  mkdirSync(folder, { recursive: true });
  const lock = acquireLock(path.join(dataDir, "tailory.lock"), folder);
  try {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = await PGlite.create(folder);
    const db = drizzle(client, { schema });
    try {
      await migrate(db, { migrationsFolder });
      await seed(db);
    } catch (error) {
      await client.close();
      throw error;
    }
    return {
      db: db as unknown as Db,
      driver: "pglite" as const,
      close: async () => {
        try {
          await client.close();
        } finally {
          lock.release();
        }
      },
    };
  } catch (error) {
    lock.release();
    throw error;
  }
};

/**
 * Opens the database the config names, Postgres for a `databaseUrl` and PGlite under the data
 * dir otherwise, and applies pending migrations before returning.
 */
export const openDatabase = async (
  config: Pick<Config, "dataDir" | "databaseUrl">,
  options: OpenOptions = {}
): Promise<Database> => {
  const migrationsFolder = options.migrationsFolder ?? findMigrations();
  return config.databaseUrl
    ? openPostgres(config.databaseUrl, migrationsFolder, options)
    : openPglite(config.dataDir, migrationsFolder);
};

export { schema };
