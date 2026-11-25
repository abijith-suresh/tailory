import type { RequestEvent } from "@solidjs/web";

import { getAuth } from "./server/auth";
import { emailPasswordEnabled, isLoopbackHost, LOCAL_USER_ID, mode } from "./server/config";
import { getDb } from "./server/db";
import { handleMcp } from "./server/mcp";
import { renderResumePdf } from "./server/pdf";

const publicPages = ["/sign-in"];

// NOTE: docs show (request, next); vite-plugin 3.0.1 actually calls (event, next).
const tailory = async (event: RequestEvent, next: () => Promise<Response>) => {
  const request = event.request;
  const url = new URL(request.url);
  const path = url.pathname;

  // Local mode: refuse any Host that isn't loopback (DNS rebinding).
  if (mode === "local" && !isLoopbackHost(url.hostname.replace(/^\[|\]$/g, ""))) {
    return new Response("Tailory local mode only answers on loopback", { status: 403 });
  }

  if (path === "/healthz") {
    const { driver } = await getDb();
    return Response.json({ ok: true, mode, driver, emailPasswordEnabled });
  }

  // Agents. Auth is decided inside (OAuth bearer vs loopback).
  if (path === "/mcp") return handleMcp(request);

  // Better Auth owns /api/auth/* and the OAuth discovery documents at the root.
  if (path.startsWith("/api/auth/") || path.startsWith("/.well-known/")) {
    if (mode === "local") return new Response(null, { status: 404 });
    return (await getAuth()).handler(request);
  }

  // Who is this request? Set once, read by server functions via locals.
  let userId: string | undefined;
  if (mode === "local") {
    userId = LOCAL_USER_ID;
  } else {
    const session = await (await getAuth()).api.getSession({ headers: request.headers });
    userId = session?.user.id;
  }
  event.locals.userId = userId;

  if (path === "/api/pdf") {
    if (!userId) return new Response(null, { status: 401 });
    const { buffer } = await renderResumePdf();
    return new Response(new Uint8Array(buffer), { headers: { "content-type": "application/pdf" } });
  }

  // Gate pages server-side: redirect before rendering, so no flash of app.
  const wantsHtml =
    request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (!userId && wantsHtml && !publicPages.includes(path) && !path.startsWith("/consent")) {
    return Response.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(path + url.search)}`, url),
      302
    );
  }
  return next();
};

export default [tailory];
