import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

import { isLoopbackHostname } from "./loopback";

// Every setting the server reads, from environment variables and CLI flags, validated in one
// place. Flags win over the environment.
//
//   local  – `tailory` on your own computer: loopback only, no sign-in, PGlite in the data dir.
//   server – Docker or a host: binds as configured; Postgres when DATABASE_URL is set. People sign
//            in with the methods the environment enables, and at least one must be.

export const DEFAULT_PORT = 4413;

export type Mode = "local" | "server";

export type OAuthApp = { clientId: string; clientSecret: string };

/** Sign-in settings. Server mode only: local mode has no sign-in. */
export type AuthConfig = {
  /** Signs sessions, tokens and OAuth state. At least 32 characters. */
  secret: string;
  /** The origin people and agents reach Tailory at, without a trailing slash. */
  publicUrl: string;
  github?: OAuthApp;
  google?: OAuthApp;
  /** Email and password sign-up and sign-in, for self-hosters. */
  emailPassword: boolean;
};

export type Config = {
  mode: Mode;
  host: string;
  port: number;
  /** Absolute path. Holds the PGlite database when there is no `databaseUrl`. */
  dataDir: string;
  /** Postgres connection string. Unset means PGlite under `dataDir`. */
  databaseUrl?: string;
  /** Take the client IP from the proxy's `X-Forwarded-For` instead of the socket. */
  trustProxy: boolean;
  /** Set in server mode, unset in local mode. */
  auth?: AuthConfig;
};

export type CliCommand = { kind: "help" } | { kind: "version" } | { kind: "run"; config: Config };

export class ConfigError extends Error {
  override name = "ConfigError";
}

export const USAGE = `Usage: tailory [options]

Starts Tailory on this computer and prints its address.

Options:
  -p, --port <port>      Port to listen on (default ${DEFAULT_PORT}, env PORT)
  -d, --data-dir <path>  Where Tailory keeps its data (default ~/.tailory, env TAILORY_DATA_DIR)
  -h, --help             Show this help
  -v, --version          Show the version

Environment:
  TAILORY_MODE           local (default) or server
  TAILORY_HOST           Address to bind (local: loopback only; server default 0.0.0.0)
  DATABASE_URL           Postgres connection string; without it, data lives in --data-dir
  TAILORY_TRUST_PROXY    true when running behind a reverse proxy (default false)

Server mode sign-in (needs a secret, a public URL, and at least one method):
  TAILORY_AUTH_SECRET            Random string of 32+ characters
  TAILORY_PUBLIC_URL             Where people reach Tailory, e.g. https://tailory.example.com
  TAILORY_AUTH_EMAIL_PASSWORD    true to allow email and password accounts
  TAILORY_GITHUB_CLIENT_ID       With TAILORY_GITHUB_CLIENT_SECRET, enables GitHub sign-in
  TAILORY_GOOGLE_CLIENT_ID       With TAILORY_GOOGLE_CLIENT_SECRET, enables Google sign-in
`;

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(blankToUndefined, z.string().optional());

const booleanFlag = z.preprocess(
  blankToUndefined,
  z
    .enum(["true", "false", "1", "0"], { message: "must be true or false" })
    .optional()
    .transform((value) => value === "true" || value === "1")
);

const schema = z
  .object({
    mode: z.preprocess(
      blankToUndefined,
      z.enum(["local", "server"], { message: "must be local or server" }).default("local")
    ),
    host: optionalString,
    port: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ message: "must be a number" })
        .int({ message: "must be a whole number" })
        .min(0, { message: "must be between 0 and 65535" })
        .max(65535, { message: "must be between 0 and 65535" })
        .default(DEFAULT_PORT)
    ),
    dataDir: optionalString,
    databaseUrl: z.preprocess(
      blankToUndefined,
      z
        .string()
        .regex(/^postgres(ql)?:\/\//, { message: "must start with postgres:// or postgresql://" })
        .optional()
    ),
    trustProxy: booleanFlag,
    authSecret: optionalString,
    publicUrl: optionalString,
    emailPassword: booleanFlag,
    githubClientId: optionalString,
    githubClientSecret: optionalString,
    googleClientId: optionalString,
    googleClientSecret: optionalString,
  })
  .superRefine((raw, ctx) => {
    const host = raw.host ?? (raw.mode === "local" ? "127.0.0.1" : "0.0.0.0");
    if (raw.mode === "local") {
      if (!isLoopbackHostname(host)) {
        ctx.addIssue({
          code: "custom",
          path: ["host"],
          message: `local mode has no sign-in, so it only listens on loopback (127.0.0.1, ::1, localhost), not ${host}. Set TAILORY_MODE=server to listen elsewhere`,
        });
      }
      return;
    }
    const issue = (key: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [key], message });
    if (!raw.authSecret) issue("authSecret", "server mode needs a secret");
    else if (raw.authSecret.length < 32) issue("authSecret", "must be at least 32 characters");
    if (!raw.publicUrl) issue("publicUrl", "server mode needs the URL people reach it at");
    else {
      const problem = publicUrlProblem(raw.publicUrl);
      if (problem) issue("publicUrl", problem);
    }
    for (const provider of ["github", "google"] as const) {
      const id = raw[`${provider}ClientId`];
      const secret = raw[`${provider}ClientSecret`];
      if (Boolean(id) !== Boolean(secret)) {
        issue(`${provider}ClientId`, "set both the client id and the client secret, or neither");
      }
    }
    const methods =
      Number(raw.emailPassword) +
      Number(Boolean(raw.githubClientId && raw.githubClientSecret)) +
      Number(Boolean(raw.googleClientId && raw.googleClientSecret));
    if (methods === 0) {
      issue(
        "signIn",
        "server mode needs a sign-in method: set TAILORY_AUTH_EMAIL_PASSWORD=true, or a GitHub or Google client id and secret"
      );
    }
  })
  .transform(
    (raw): Config => ({
      mode: raw.mode,
      host: raw.host ?? (raw.mode === "local" ? "127.0.0.1" : "0.0.0.0"),
      port: raw.port,
      dataDir: path.resolve(raw.dataDir ?? path.join(homedir(), ".tailory")),
      databaseUrl: raw.databaseUrl,
      trustProxy: raw.trustProxy,
      auth:
        raw.mode === "server"
          ? {
              secret: raw.authSecret as string,
              publicUrl: new URL(raw.publicUrl as string).origin,
              github: oauthApp(raw.githubClientId, raw.githubClientSecret),
              google: oauthApp(raw.googleClientId, raw.googleClientSecret),
              emailPassword: raw.emailPassword,
            }
          : undefined,
    })
  );

const oauthApp = (clientId?: string, clientSecret?: string): OAuthApp | undefined =>
  clientId && clientSecret ? { clientId, clientSecret } : undefined;

/**
 * Why a public URL can't be used, or null. OAuth needs HTTPS; plain HTTP only works on loopback,
 * for trying server mode on your own computer. Tailory is served from the root of the origin.
 */
const publicUrlProblem = (value: string): string | null => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "must be a URL such as https://tailory.example.com";
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLoopbackHostname(url.hostname))
  ) {
    return "must use https (http works only for localhost)";
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    return "must be just the origin, such as https://tailory.example.com, with no path";
  }
  return null;
};

const settingNames: Record<string, string> = {
  mode: "TAILORY_MODE",
  host: "TAILORY_HOST",
  port: "--port / PORT",
  dataDir: "--data-dir / TAILORY_DATA_DIR",
  databaseUrl: "DATABASE_URL",
  trustProxy: "TAILORY_TRUST_PROXY",
  authSecret: "TAILORY_AUTH_SECRET",
  publicUrl: "TAILORY_PUBLIC_URL",
  emailPassword: "TAILORY_AUTH_EMAIL_PASSWORD",
  githubClientId: "TAILORY_GITHUB_CLIENT_ID / TAILORY_GITHUB_CLIENT_SECRET",
  googleClientId: "TAILORY_GOOGLE_CLIENT_ID / TAILORY_GOOGLE_CLIENT_SECRET",
  signIn: "Sign-in",
};

type Env = Record<string, string | undefined>;

/** Validates settings from the environment, with CLI flag values layered on top. */
export const resolveConfig = (
  env: Env,
  flags: { port?: string; dataDir?: string } = {}
): Config => {
  const result = schema.safeParse({
    mode: env.TAILORY_MODE,
    host: env.TAILORY_HOST,
    port: flags.port ?? env.PORT,
    dataDir: flags.dataDir ?? env.TAILORY_DATA_DIR,
    databaseUrl: env.DATABASE_URL,
    trustProxy: env.TAILORY_TRUST_PROXY,
    authSecret: env.TAILORY_AUTH_SECRET,
    publicUrl: env.TAILORY_PUBLIC_URL,
    emailPassword: env.TAILORY_AUTH_EMAIL_PASSWORD,
    githubClientId: env.TAILORY_GITHUB_CLIENT_ID,
    githubClientSecret: env.TAILORY_GITHUB_CLIENT_SECRET,
    googleClientId: env.TAILORY_GOOGLE_CLIENT_ID,
    googleClientSecret: env.TAILORY_GOOGLE_CLIENT_SECRET,
  });
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    const key = String(issue.path[0] ?? "");
    return `${settingNames[key] ?? key}: ${issue.message}`;
  });
  throw new ConfigError(`Invalid configuration:\n  ${problems.join("\n  ")}`);
};

/** Parses `tailory` arguments into what to do. Throws ConfigError on bad flags or settings. */
export const parseCommand = (argv: string[], env: Env): CliCommand => {
  let values: { port?: string; "data-dir"?: string; help?: boolean; version?: boolean };
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        port: { type: "string", short: "p" },
        "data-dir": { type: "string", short: "d" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    }));
  } catch (error) {
    throw new ConfigError((error as Error).message);
  }
  if (values.help) return { kind: "help" };
  if (values.version) return { kind: "version" };
  return {
    kind: "run",
    config: resolveConfig(env, { port: values.port, dataDir: values["data-dir"] }),
  };
};
