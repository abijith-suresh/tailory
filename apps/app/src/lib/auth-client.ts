import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/client";

// Better Auth's framework-free client. Don't use `better-auth/solid`: it is written for Solid 1.
// The OAuth provider plugin adds the signed authorization request to sign-in and consent calls,
// so signing in from the MCP authorization flow continues that flow.
export const authClient = createAuthClient({ plugins: [oauthProviderClient()] });

/** A same-origin path from `?next=`, or "/". Anything else could send people off-site. */
export const nextPath = (search: string) => {
  const next = new URLSearchParams(search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
};

/** Where Better Auth told the page to go, when it did. */
export const redirectOf = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const { url, redirect_uri: redirectUri } = data as { url?: unknown; redirect_uri?: unknown };
  if (typeof url === "string") return url;
  return typeof redirectUri === "string" ? redirectUri : undefined;
};
