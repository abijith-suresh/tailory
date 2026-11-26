import type { StartMiddleware } from "@solidjs/vite-plugin";
import { sql } from "drizzle-orm";

import { AUTH_BASE_PATH, SIGN_IN_PATH } from "./server/auth";
import { DOWNLOAD_PATH, handleDownload } from "./server/downloads";
import { localRejectionResponse, localRequestRejection } from "./server/loopback";
import { handleMcp } from "./server/mcp";
import { getAuth, getConfig, getDatabase } from "./server/runtime";
import { viewerOf } from "./server/session";

// The plugin calls each middleware as (event, next); `next()` takes no arguments.

const pathOf = (request: Request) => new URL(request.url).pathname;

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
  if (pathOf(event.request) !== "/healthz") return next();
  const { db } = await getDatabase();
  await db.execute(sql`select 1`);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
};

/**
 * Better Auth owns its API and the OAuth discovery documents at the root of the origin
 * (`/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server/api/auth`
 * and the OpenID configuration). Local mode has no sign-in, so they don't exist there.
 */
const authRoutes: StartMiddleware = async (event, next) => {
  const path = pathOf(event.request);
  if (!path.startsWith(`${AUTH_BASE_PATH}/`) && !path.startsWith("/.well-known/")) return next();
  if (!getConfig().auth) return new Response("Not found", { status: 404 });
  return (await getAuth()).handler(event.request);
};

/** The MCP endpoint. It checks the agent's access itself; see src/server/mcp.ts. */
const mcp: StartMiddleware = (event, next) =>
  pathOf(event.request) === "/mcp" ? handleMcp(event.request) : next();

/**
 * Resume downloads from export_resume. The link's signed token is the authority, so it works in
 * a browser that isn't signed in; see src/server/downloads.ts.
 */
const downloads: StartMiddleware = (event, next) =>
  pathOf(event.request).startsWith(DOWNLOAD_PATH) ? handleDownload(event.request) : next();

/** Paths a signed-out person may open. */
const PUBLIC_PAGES = new Set([SIGN_IN_PATH]);

/**
 * Sends signed-out page requests to the sign-in page. Server functions (under /_server) aren't
 * pages: each one checks the user itself and answers 401.
 */
const signInGate: StartMiddleware = async (event, next) => {
  const { request } = event;
  const url = new URL(request.url);
  if (getConfig().mode === "local") {
    // Nothing to sign in to.
    if (url.pathname === SIGN_IN_PATH) return Response.redirect(new URL("/", url), 302);
    return next();
  }
  const isPage = request.method === "GET" || request.method === "HEAD";
  if (!isPage || url.pathname.startsWith("/_server")) return next();
  if (PUBLIC_PAGES.has(url.pathname)) return next();
  if (await viewerOf(request)) return next();
  const signIn = new URL(SIGN_IN_PATH, url);
  signIn.searchParams.set("next", url.pathname + url.search);
  return new Response(null, {
    status: 302,
    headers: { location: signIn.pathname + signIn.search, "cache-control": "no-store" },
  });
};

export default [loopbackOnly, health, authRoutes, mcp, downloads, signInGate];
