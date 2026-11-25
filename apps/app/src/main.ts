import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { CLIENT_IP_HEADER, clientIp } from "./server/client-ip";
import { type Config, ConfigError, parseCommand, USAGE } from "./server/config";
import { type Database, openDatabase, pgliteFolder } from "./server/db";
import { isNotReadyError } from "./server/db/retry";
import { LockError } from "./server/lock";
import { localRequestRejection } from "./server/loopback";
import { setRuntime } from "./server/runtime";

declare const __TAILORY_VERSION__: string;

type NodeListener = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
type NodeEntry = { createListener: () => NodeListener };

const say = (line: string) => process.stdout.write(`${line}\n`);
const fail = (line: string) => process.stderr.write(`${line}\n`);

const displayUrl = (config: Config, port: number) => {
  if (config.mode === "local") {
    const host = config.host.includes(":") ? `[${config.host}]` : config.host;
    return `http://${host}:${port}`;
  }
  return config.auth?.publicUrl ?? `http://localhost:${port}`;
};

const listen = (config: Config, listener: NodeListener) =>
  new Promise<ReturnType<typeof createServer>>((resolve, reject) => {
    const server = createServer((req, res) => {
      // The plugin's listener serves static files before middleware runs, so the loopback check
      // for local mode happens here too, ahead of everything.
      if (config.mode === "local") {
        const reason = localRequestRejection({
          host: req.headers.host,
          origin: req.headers.origin,
        });
        if (reason) {
          res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
          res.end(`Forbidden: ${reason}. Tailory local mode only answers on this computer.\n`);
          return;
        }
      }
      // Better Auth reads the client IP from this header. Whatever the client sent is replaced.
      const ip = clientIp({
        socketAddress: req.socket.remoteAddress,
        forwardedFor: req.headers["x-forwarded-for"],
        trustProxy: config.trustProxy,
      });
      if (ip) req.headers[CLIENT_IP_HEADER] = ip;
      else delete req.headers[CLIENT_IP_HEADER];
      void listener(req, res);
    });
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });

const describeStartupError = (error: unknown, config: Config): string => {
  const { code } = error as NodeJS.ErrnoException;
  if (code === "EADDRINUSE") {
    return `Port ${config.port} is already in use. Pick another with --port.`;
  }
  if (code === "EACCES" || code === "EPERM") {
    return `Not allowed to listen on ${config.host}:${config.port}. Pick another port with --port.`;
  }
  if (error instanceof LockError) return error.message;
  if (isNotReadyError(error)) {
    const cause = (error as { cause?: Error }).cause ?? (error as Error);
    return `Could not reach Postgres (DATABASE_URL) within 30 s: ${cause.message}`;
  }
  return `Tailory could not start: ${(error as Error).stack ?? String(error)}`;
};

/** Runs the `tailory` command. Resolves with the exit code when it exits early. */
export const main = async (argv: string[], env = process.env): Promise<number | undefined> => {
  let config: Config;
  try {
    const command = parseCommand(argv, env);
    if (command.kind === "help") {
      say(USAGE);
      return 0;
    }
    if (command.kind === "version") {
      say(__TAILORY_VERSION__);
      return 0;
    }
    config = command.config;
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    fail(error.message);
    fail("Run tailory --help for the options.");
    return 2;
  }

  const started = performance.now();
  let database: Database | undefined;
  try {
    database = await openDatabase(config, { log: say });
    setRuntime(config, database);
    const nodeEntry = new URL("./node.js", import.meta.url).href;
    const { createListener } = (await import(/* @vite-ignore */ nodeEntry)) as NodeEntry;
    const server = await listen(config, createListener());
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.port;

    say(`Tailory ${__TAILORY_VERSION__} is running at ${displayUrl(config, port)}`);
    say(
      database.driver === "pglite"
        ? `Data: ${pgliteFolder(config.dataDir)}`
        : "Data: Postgres (DATABASE_URL)"
    );
    say(`Ready in ${Math.round(performance.now() - started)} ms. Press Ctrl+C to stop.`);

    const open = database;
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      server.close();
      server.closeAllConnections();
      open.close().finally(() => process.exit(0));
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return undefined;
  } catch (error) {
    await database?.close().catch(() => {});
    fail(describeStartupError(error, config));
    return 1;
  }
};
