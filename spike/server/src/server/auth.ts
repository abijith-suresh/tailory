import { betterAuth } from "better-auth";

import { authOptions } from "./auth-options";
import { getDb, schema } from "./db";

const create = async () => {
  const { db } = await getDb();
  return betterAuth(authOptions(db, schema));
};

export type Auth = Awaited<ReturnType<typeof create>>;
const key = Symbol.for("tailory.auth");
type G = typeof globalThis & { [key]?: Promise<Auth> };
export const getAuth = () => ((globalThis as G)[key] ??= create());
