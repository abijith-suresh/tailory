import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { mcp } from "@better-auth/mcp";
import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

import { CLIENT_IP_HEADER } from "./client-ip";
import type { AuthConfig } from "./config";
import type { Db } from "./db";
import * as schema from "./db/schema";

// Better Auth in server mode: sessions for the web app, and the OAuth authorization server that
// MCP clients sign in through. Local mode has no sign-in and never builds this.

/** The one scope MCP access tokens carry. */
export const MCP_SCOPE = "tailory";

/** Where Better Auth's endpoints live; also the OAuth issuer's path. */
export const AUTH_BASE_PATH = "/api/auth";

export const SIGN_IN_PATH = "/sign-in";
export const CONSENT_PATH = "/oauth/consent";

export const mcpResource = (auth: AuthConfig) => `${auth.publicUrl}/mcp`;
export const authIssuer = (auth: AuthConfig) => `${auth.publicUrl}${AUTH_BASE_PATH}`;

export type AuthOverrides = {
  /**
   * Fetches Client ID Metadata Documents. The default resolves DNS once, refuses private and
   * special-use addresses, pins the connection, and never follows redirects. Tests swap it for
   * an in-process one, since a metadata document has to be on a public HTTPS URL.
   */
  fetchClientMetadataResource?: ClientMetadataResourceFetch;
};

export const authOptions = (auth: AuthConfig, db: Db, overrides: AuthOverrides = {}) => {
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (auth.github) socialProviders.github = auth.github;
  if (auth.google) socialProviders.google = auth.google;
  return {
    appName: "Tailory",
    baseURL: auth.publicUrl,
    basePath: AUTH_BASE_PATH,
    secret: auth.secret,
    trustedOrigins: [auth.publicUrl],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders,
    emailAndPassword: { enabled: auth.emailPassword, minPasswordLength: 12 },
    // src/main.ts sets this header from the socket, or from X-Forwarded-For when
    // TAILORY_TRUST_PROXY is on, and drops any value the client sent.
    advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
    plugins: [
      jwt(),
      mcp({
        loginPage: SIGN_IN_PATH,
        consentPage: CONSENT_PATH,
        resource: mcpResource(auth),
        scopes: ["openid", "profile", "email", "offline_access", MCP_SCOPE],
        grantTypes: ["authorization_code", "refresh_token"],
        // Client ID Metadata Documents (below) are how 2026-07-28 clients identify themselves.
        // Dynamic Client Registration is deprecated in that revision but still allowed, and
        // clients that haven't moved to CIMD use it, so it stays on.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
      cimd({
        fetchClientMetadataResource:
          overrides.fetchClientMetadataResource ?? fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
  };
};

export const createAuth = (auth: AuthConfig, db: Db, overrides?: AuthOverrides) =>
  betterAuth(authOptions(auth, db, overrides));

export type Auth = ReturnType<typeof createAuth>;
