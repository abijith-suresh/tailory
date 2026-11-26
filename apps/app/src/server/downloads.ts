import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { ResumeExportValidationError } from "@tailory/core";
import { eq } from "drizzle-orm";

import { DataError, getApplication, getProfile } from "./data";
import { schema } from "./db";
import { renderJsonResume, renderPdf } from "./render";
import { getConfig, getDatabase } from "./runtime";

// Download links for `export_resume`. An agent hands the link to a person, who opens it in
// whatever browser they have, signed in or not, so the link carries its own authority: a token
// naming the user, the resume and the format, signed with a server key and good for an hour.
// The download checks the resume still belongs to that user and renders it as it is then.
//
// Why not the session cookie: the agent's link would only work in a browser already signed in to
// this server, and local mode has no sign-in at all. Why it can't leak another user's data: the
// user id is inside the signature, and the application is read with that user's id, so a token
// opens only what its own user could open through MCP.

export const DOWNLOAD_PATH = "/download/";

/** How long a download link works. */
export const DOWNLOAD_TTL_SECONDS = 60 * 60;

export type DownloadFormat = "pdf" | "json";

export type DownloadClaims = {
  userId: string;
  /** The application, or null for the bare profile. */
  applicationId: string | null;
  format: DownloadFormat;
  /** Unix seconds. */
  expiresAt: number;
};

// Local mode has no configured secret. A key made at start-up is enough there: its links stop
// working when Tailory restarts, and the agent can ask for a new one.
const localKey = randomBytes(32);

const signingKey = () => {
  const secret = getConfig().auth?.secret;
  return secret ? createHmac("sha256", secret).update("tailory download links").digest() : localKey;
};

const sign = (body: string) => createHmac("sha256", signingKey()).update(body).digest();

export const createDownloadToken = (claims: DownloadClaims): string => {
  const body = Buffer.from(
    JSON.stringify({
      u: claims.userId,
      a: claims.applicationId,
      f: claims.format,
      e: claims.expiresAt,
    })
  ).toString("base64url");
  return `${body}.${sign(body).toString("base64url")}`;
};

/** The claims of a token this server signed and that hasn't expired, or null. */
export const readDownloadToken = (token: string, now = Date.now()): DownloadClaims | null => {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = sign(body);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let raw: { u?: unknown; a?: unknown; f?: unknown; e?: unknown };
  try {
    raw = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof raw.u !== "string" ||
    !(raw.a === null || typeof raw.a === "string") ||
    (raw.f !== "pdf" && raw.f !== "json") ||
    typeof raw.e !== "number" ||
    raw.e * 1000 <= now
  ) {
    return null;
  }
  return { userId: raw.u, applicationId: raw.a, format: raw.f, expiresAt: raw.e };
};

/** A download link for `origin`, good for DOWNLOAD_TTL_SECONDS. */
export const createDownloadLink = (
  origin: string,
  claims: Omit<DownloadClaims, "expiresAt">,
  now = Date.now()
) => {
  const expiresAt = Math.floor(now / 1000) + DOWNLOAD_TTL_SECONDS;
  const token = createDownloadToken({ ...claims, expiresAt });
  return {
    url: `${origin}${DOWNLOAD_PATH}${token}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
};

const slug = (...parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "resume";

const plain = (status: number, text: string) =>
  new Response(`${text}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

/** Serves GET /download/<token>. */
export const handleDownload = async (request: Request): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return plain(405, "Method not allowed");
  }
  const token = new URL(request.url).pathname.slice(DOWNLOAD_PATH.length);
  const claims = readDownloadToken(token);
  if (!claims) {
    return plain(
      404,
      "This download link is invalid or has expired. Ask your agent for a new one."
    );
  }
  const { db } = await getDatabase();
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, claims.userId));
  if (!user) return plain(404, "This download link is invalid or has expired.");
  const ctx = { db, userId: claims.userId };

  let application = null;
  try {
    application = claims.applicationId ? await getApplication(ctx, claims.applicationId) : null;
  } catch (error) {
    if (error instanceof DataError) return plain(404, "This application no longer exists.");
    throw error;
  }
  const { resume: profile } = await getProfile(ctx);
  const name = slug(profile.basics.name, application?.company, application?.role);
  const headers = {
    "cache-control": "private, no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  };
  if (claims.format === "json") {
    const document = renderJsonResume(profile, application);
    return new Response(`${JSON.stringify(document, null, 2)}\n`, {
      headers: {
        ...headers,
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${name}.json"`,
      },
    });
  }
  try {
    const pdf = await renderPdf(profile, application);
    return new Response(Buffer.from(pdf), {
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${name}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof ResumeExportValidationError) return plain(422, error.message);
    throw error;
  }
};
