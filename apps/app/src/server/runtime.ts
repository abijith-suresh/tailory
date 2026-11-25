import { type Auth, type AuthOverrides, createAuth } from "./auth";
import { type Config, resolveConfig } from "./config";
import { type Database, openDatabase } from "./db";

// The running server's config, database and Better Auth instance. `tailory` (src/main.ts) sets
// the first two before it takes requests. Under `vite dev` nothing sets them, so they come from
// the environment on first use. State lives on globalThis so dev reloads of this module don't
// open the database twice.

type Runtime = {
  config?: Config;
  database?: Promise<Database>;
  auth?: Promise<Auth>;
  authOverrides?: AuthOverrides;
};

const key = Symbol.for("tailory.runtime");
const runtime = (): Runtime => ((globalThis as { [key]?: Runtime })[key] ??= {});

export const setRuntime = (config: Config, database: Database, authOverrides?: AuthOverrides) => {
  const state = runtime();
  state.config = config;
  state.database = Promise.resolve(database);
  state.auth = undefined;
  state.authOverrides = authOverrides;
};

/** Forgets the running server's state. For tests. */
export const resetRuntime = () => {
  (globalThis as { [key]?: Runtime })[key] = {};
};

export const getConfig = (): Config => (runtime().config ??= resolveConfig(process.env));

export const getDatabase = (): Promise<Database> =>
  (runtime().database ??= openDatabase(getConfig()));

/** Better Auth. Server mode only: local mode has no sign-in. */
export const getAuth = (): Promise<Auth> => {
  const state = runtime();
  state.auth ??= (async () => {
    const { auth } = getConfig();
    if (!auth) throw new Error("Sign-in is off in local mode");
    const { db } = await getDatabase();
    return createAuth(auth, db, state.authOverrides);
  })();
  return state.auth;
};
