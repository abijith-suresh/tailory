import { cimd } from "@better-auth/cimd";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { mcp } from "@better-auth/mcp";
import type { BetterAuthOptions } from "better-auth";
import { jwt } from "better-auth/plugins";

import { emailPasswordEnabled, siteUrl } from "./config";

export const MCP_SCOPE = "resume:read";

export const authOptions = (db: unknown, schema?: Record<string, unknown>) =>
  ({
    appName: "Tailory",
    baseURL: siteUrl,
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET ?? "spike-only-secret-spike-only-secret-0000",
    database: drizzleAdapter(db as never, { provider: "pg", schema }),
    // Hosted: GitHub + Google. Dummy keys are fine for proving routes.
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID ?? "dummy-github-id",
        clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "dummy-github-secret",
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "dummy-google-id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "dummy-google-secret",
      },
    },
    // Self-hosted: email+password behind a flag.
    emailAndPassword: { enabled: emailPasswordEnabled, minPasswordLength: 12 },
    plugins: [
      jwt(),
      mcp({
        loginPage: "/sign-in",
        consentPage: "/consent",
        resource: `${siteUrl}/mcp`,
        scopes: ["openid", "profile", "email", "offline_access", MCP_SCOPE],
        grantTypes: ["authorization_code", "refresh_token"],
        // Spike: allow DCR so the SDK client can register itself. plansplease
        // keeps this off and relies on CIMD; same switch here.
        allowDynamicClientRegistration: process.env.MCP_ALLOW_DCR !== "false",
        allowUnauthenticatedClientRegistration: process.env.MCP_ALLOW_DCR !== "false",
      }),
      // CIMD: in Node we can fetch directly (plansplease proxies because Convex
      // actions can't). Production needs SSRF guards here.
      cimd({
        fetchClientMetadataResource: (input, init) => fetch(input, { ...init, redirect: "error" }),
        metadataProfile: "mcp-2026-07-28",
      }),
    ],
  }) satisfies BetterAuthOptions;
