import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { StartMiddleware } from "@solidjs/vite-plugin";
import postgres from "postgres";

import middleware from "../../middleware";
import type { AuthOverrides } from "../auth";
import { CLIENT_IP_HEADER } from "../client-ip";
import { resolveConfig } from "../config";
import { type Database, openDatabase } from "../db";
import { resetRuntime, setRuntime } from "../runtime";

// Runs the app's middleware (sign-in, OAuth discovery, /mcp) behind a real HTTP server, so tests
// can drive it with real clients. Pages aren't rendered: anything the middleware passes on gets a
// 404, and the tests call the auth API the pages call.

export type TestServer = {
  url: string;
  database: Database;
  close: () => Promise<void>;
};

export type TestServerOptions = {
  mode: "local" | "server";
  /** Postgres to use instead of a fresh PGlite. Its public schema is dropped and recreated. */
  databaseUrl?: string;
  env?: Record<string, string>;
  authOverrides?: AuthOverrides;
};

type Event = Parameters<StartMiddleware>[0];

const run = (event: Event, index = 0): Promise<Response> => {
  const handler = middleware[index];
  if (!handler) return Promise.resolve(new Response("Not found", { status: 404 }));
  return Promise.resolve(handler(event, () => run(event, index + 1)));
};

const toRequest = async (req: IncomingMessage, origin: string): Promise<Request> => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    for (const item of [value ?? []].flat()) headers.append(name, item);
  }
  headers.set(CLIENT_IP_HEADER, "127.0.0.1");
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(new URL(req.url ?? "/", origin), { method: req.method, headers, body });
};

const send = async (response: Response, res: ServerResponse) => {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") headers[name] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body as never).pipe(res);
};

export const resetPostgres = async (url: string) => {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await client`drop schema if exists drizzle cascade`;
  await client`drop schema public cascade`;
  await client`create schema public`;
  await client.end();
};

export const startTestServer = async (options: TestServerOptions): Promise<TestServer> => {
  const dataDir = mkdtempSync(path.join(tmpdir(), "tailory-test-"));
  let origin = "";
  const server: Server = createServer((req, res) => {
    toRequest(req, origin)
      .then((request) => run({ request, locals: {} } as unknown as Event))
      .then((response) => send(response, res))
      .catch((error: Error) => {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(error.stack);
      });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  // The public URL uses `localhost`: OAuth allows plain HTTP for loopback hosts only.
  origin = `http://localhost:${port}`;

  const config = resolveConfig({
    TAILORY_MODE: options.mode,
    ...(options.mode === "server"
      ? {
          TAILORY_AUTH_SECRET: "test-secret-test-secret-test-secret-0000",
          TAILORY_PUBLIC_URL: origin,
          TAILORY_AUTH_EMAIL_PASSWORD: "true",
        }
      : {}),
    ...options.env,
  });
  if (options.databaseUrl) await resetPostgres(options.databaseUrl);
  const database = await openDatabase({ ...config, dataDir, databaseUrl: options.databaseUrl });
  resetRuntime();
  setRuntime({ ...config, port }, database, options.authOverrides);

  return {
    url: origin,
    database,
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await database.close();
      resetRuntime();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
};
