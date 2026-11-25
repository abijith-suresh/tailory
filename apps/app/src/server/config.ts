import { homedir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

import { isLoopbackHostname } from "./loopback";

// Every setting the server reads, from environment variables and CLI flags, validated in one
// place. Flags win over the environment.
//
//   local  – `tailory` on your own computer: loopback only, no sign-in, PGlite in the data dir.
//   server – Docker or a host: binds as configured; Postgres when DATABASE_URL is set.

export const DEFAULT_PORT = 4413;

export type Mode = "local" | "server";

export type Config = {
  mode: Mode;
  host: string;
  port: number;
  /** Absolute path. Holds the PGlite database when there is no `databaseUrl`. */
  dataDir: string;
  /** Postgres connection string. Unset means PGlite under `dataDir`. */
  databaseUrl?: string;
  /** Trust `X-Forwarded-*` from a reverse proxy. Parsed now; read once sign-in lands. */
  trustProxy: boolean;
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
  })
  .transform(
    (raw): Config => ({
      mode: raw.mode,
      host: raw.host ?? (raw.mode === "local" ? "127.0.0.1" : "0.0.0.0"),
      port: raw.port,
      dataDir: path.resolve(raw.dataDir ?? path.join(homedir(), ".tailory")),
      databaseUrl: raw.databaseUrl,
      trustProxy: raw.trustProxy,
    })
  )
  .superRefine((config, ctx) => {
    if (config.mode === "local" && !isLoopbackHostname(config.host)) {
      ctx.addIssue({
        code: "custom",
        path: ["host"],
        message: `local mode has no sign-in, so it only listens on loopback (127.0.0.1, ::1, localhost), not ${config.host}. Set TAILORY_MODE=server to listen elsewhere`,
      });
    }
  });

const settingNames: Record<string, string> = {
  mode: "TAILORY_MODE",
  host: "TAILORY_HOST",
  port: "--port / PORT",
  dataDir: "--data-dir / TAILORY_DATA_DIR",
  databaseUrl: "DATABASE_URL",
  trustProxy: "TAILORY_TRUST_PROXY",
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
