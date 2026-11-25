import { type Config, resolveConfig } from "./config";
import { type Database, openDatabase } from "./db";

// The running server's config and database. `tailory` (src/main.ts) sets both before it takes
// requests. Under `vite dev` nothing sets them, so they come from the environment on first use.
// State lives on globalThis so dev reloads of this module don't open the database twice.

type Runtime = { config?: Config; database?: Promise<Database> };

const key = Symbol.for("tailory.runtime");
const runtime = (): Runtime => ((globalThis as { [key]?: Runtime })[key] ??= {});

export const setRuntime = (config: Config, database: Database) => {
  runtime().config = config;
  runtime().database = Promise.resolve(database);
};

export const getConfig = (): Config => (runtime().config ??= resolveConfig(process.env));

export const getDatabase = (): Promise<Database> =>
  (runtime().database ??= openDatabase(getConfig()));
