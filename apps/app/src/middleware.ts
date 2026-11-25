import type { StartMiddleware } from "@solidjs/vite-plugin";
import { sql } from "drizzle-orm";

import { localRejectionResponse, localRequestRejection } from "./server/loopback";
import { getConfig, getDatabase } from "./server/runtime";

// The plugin calls each middleware as (event, next); `next()` takes no arguments.

/** Local mode answers loopback requests only. Static files get the same check in src/main.ts. */
const loopbackOnly: StartMiddleware = (event, next) => {
  if (getConfig().mode !== "local") return next();
  const { headers } = event.request;
  const reason = localRequestRejection({
    host: headers.get("host"),
    origin: headers.get("origin"),
  });
  return reason ? localRejectionResponse(reason) : next();
};

/** Liveness and database reachability, for container health checks. */
const health: StartMiddleware = async (event, next) => {
  if (new URL(event.request.url).pathname !== "/healthz") return next();
  const { db } = await getDatabase();
  await db.execute(sql`select 1`);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
};

export default [loopbackOnly, health];
