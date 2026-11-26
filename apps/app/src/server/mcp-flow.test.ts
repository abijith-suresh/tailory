import { PROTOCOL_VERSION_META_KEY } from "@modelcontextprotocol/server";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { deleteUser } from "./account";
import { MCP_PROTOCOL_VERSIONS } from "./mcp";
import {
  CIMD_CLIENT_ID,
  callTool,
  fetchCimdDocument,
  runMcpFlow,
  signUp,
} from "./testing/mcp-client";
import { driveResumeFlow, RESUME_TOOLS } from "./testing/resume-flow";
import { startTestServer, type TestServer } from "./testing/server";

// The MCP endpoint end to end with the official SDK client (2026-07-28). Server mode runs on
// PGlite, and on Postgres too when TAILORY_TEST_DATABASE_URL is set (CI's app-postgres job).

const postgresUrl = process.env.TAILORY_TEST_DATABASE_URL;
const databases = [
  { name: "PGlite", url: undefined },
  ...(postgresUrl ? [{ name: "Postgres", url: postgresUrl }] : []),
];

describe.each(databases)("server mode on $name", ({ url }) => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({
      mode: "server",
      databaseUrl: url,
      authOverrides: { fetchClientMetadataResource: fetchCimdDocument },
    });
  });
  afterAll(() => server.close());

  it("publishes metadata that points 2026-07-28 clients at CIMD and DCR", async () => {
    const challenge = await fetch(`${server.url}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: "{}",
    });
    expect(challenge.status).toBe(401);
    expect(challenge.headers.get("www-authenticate")).toContain(
      `resource_metadata="${server.url}/.well-known/oauth-protected-resource/mcp"`
    );

    const resource = await (
      await fetch(`${server.url}/.well-known/oauth-protected-resource/mcp`)
    ).json();
    expect(resource).toMatchObject({
      resource: `${server.url}/mcp`,
      authorization_servers: [`${server.url}/api/auth`],
      scopes_supported: ["tailory"],
    });

    const issuer = await (
      await fetch(`${server.url}/.well-known/oauth-authorization-server/api/auth`)
    ).json();
    expect(issuer).toMatchObject({
      issuer: `${server.url}/api/auth`,
      client_id_metadata_document_supported: true,
      registration_endpoint: `${server.url}/api/auth/oauth2/register`,
      authorization_response_iss_parameter_supported: true,
      code_challenge_methods_supported: ["S256"],
    });
  });

  it("signs in a client by its Client ID Metadata Document and serves its calls", async () => {
    const cookie = await signUp(server.url, "Ada Lovelace");
    const result = await runMcpFlow(`${server.url}/mcp`, { cookie, registration: "cimd" });
    // The metadata URL is the client id; nothing was registered.
    expect(result.log.registeredClientId).toBe(CIMD_CLIENT_ID);
    expect(result.log.authorizeRedirect).toBe("/oauth/consent");
    expect(result.log.callback?.get("iss")).toBe(`${server.url}/api/auth`);
    expect(result.log.scope?.split(" ")).toContain("tailory");
    expect(result.protocolVersion).toBe("2026-07-28");
    expect(result.tools).toEqual(RESUME_TOOLS);
    await result.client.close();

    const client = await server.database.db.query.oauthClient.findFirst({
      where: (table, { eq }) => eq(table.clientId, CIMD_CLIENT_ID),
    });
    expect(client).toMatchObject({ name: "Tailory test agent (CIMD)" });
    expect(client?.clientDiscoveryId).toBeTruthy();
  });

  it("signs in a client by Dynamic Client Registration and serves its calls", async () => {
    const cookie = await signUp(server.url, "Grace Hopper");
    const result = await runMcpFlow(`${server.url}/mcp`, { cookie, registration: "dcr" });
    expect(result.log.registeredClientId).toEqual(expect.not.stringMatching(/^https:/));
    const client = await server.database.db.query.oauthClient.findFirst({
      where: (table, { eq }) => eq(table.clientId, result.log.registeredClientId as string),
    });
    expect(client).toMatchObject({ name: "Tailory test agent (DCR)", clientDiscoveryId: null });
    expect(result.log.callback?.get("iss")).toBe(`${server.url}/api/auth`);
    expect(result.protocolVersion).toBe("2026-07-28");
    expect(result.tools).toEqual(RESUME_TOOLS);
    await result.client.close();
  });

  it("drives the whole resume flow, and keeps one user's applications from another", async () => {
    const owner = await runMcpFlow(`${server.url}/mcp`, {
      cookie: await signUp(server.url, "Resume Owner"),
      registration: "cimd",
    });
    const other = await runMcpFlow(`${server.url}/mcp`, {
      cookie: await signUp(server.url, "Someone Else"),
      registration: "dcr",
    });
    try {
      const { applicationId, downloadUrl } = await driveResumeFlow(owner.client, server, {
        actorClient: "Tailory test agent (CIMD)",
      });

      // The second user can't read, change or export the first user's application by id.
      for (const [name, args] of [
        ["get_application", { id: applicationId }],
        ["tailor_application", { id: applicationId, pageTarget: 2 }],
        ["update_application", { id: applicationId, status: "withdrawn" }],
        ["export_resume", { applicationId }],
      ] as const) {
        const answer = await callTool(other.client, name, args);
        expect(answer.isError, name).toBe(true);
        expect(answer.text).toContain("Application not found");
      }
      const list = await callTool(other.client, "list_applications", { archived: "include" });
      expect(list.data.applications).toEqual([]);

      // A download link names its user inside the signature: changing it breaks the link.
      const [body, signature] = new URL(downloadUrl).pathname.split("/").pop()?.split(".") ?? [];
      const claims = JSON.parse(Buffer.from(body ?? "", "base64url").toString());
      const forged = Buffer.from(JSON.stringify({ ...claims, u: "someone-else" })).toString(
        "base64url"
      );
      const response = await fetch(`${server.url}/download/${forged}.${signature}`);
      expect(response.status).toBe(404);
    } finally {
      await owner.client.close();
      await other.client.close();
    }
  });

  it("refuses a token-less call and a forged token", async () => {
    for (const authorization of [undefined, "Bearer not-a-token"]) {
      const response = await fetch(`${server.url}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(response.status).toBe(401);
    }
  });

  it("deletes an account with everything it owns, and its tokens stop working", async () => {
    const cookie = await signUp(server.url, "Short Lived");
    const { log, client } = await runMcpFlow(`${server.url}/mcp`, { cookie, registration: "dcr" });
    await client.close();
    const session = (await (
      await fetch(`${server.url}/api/auth/get-session`, { headers: { cookie } })
    ).json()) as { user: { id: string } };
    const userId = session.user.id;
    const { db } = server.database;
    const owned = async () => {
      const counts: Record<string, number> = {};
      for (const table of [
        "session",
        "account",
        "oauth_consent",
        "oauth_access_token",
        "oauth_refresh_token",
      ]) {
        const result: unknown = await db.execute(
          sql`select count(*)::int as n from ${sql.identifier(table)} where user_id = ${userId}`
        );
        const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
        counts[table] = (rows[0] as { n: number }).n;
      }
      return counts;
    };
    // Access tokens are signed JWTs and aren't stored; the rest are rows.
    expect(await owned()).toMatchObject({
      session: 1,
      account: 1,
      oauth_consent: 1,
      oauth_refresh_token: 1,
    });

    await deleteUser(db, userId);

    expect(await owned()).toEqual({
      session: 0,
      account: 0,
      oauth_consent: 0,
      oauth_access_token: 0,
      oauth_refresh_token: 0,
    });
    const response = await fetch(`${server.url}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${log.accessToken}`,
      },
      body: "{}",
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"');
  });
});

/** A raw JSON-RPC POST to /mcp, as a client that doesn't use the SDK would send it. */
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${url}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });

const envelope = (version: string) => ({
  [PROTOCOL_VERSION_META_KEY]: version,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "raw", version: "1.0.0" },
});

describe("protocol revisions", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "local" });
  });
  afterAll(() => server.close());

  it("serves 2026-07-28 only", () => {
    expect(MCP_PROTOCOL_VERSIONS).toEqual(["2026-07-28"]);
  });

  it("answers a stateless 2026-07-28 request without a session", async () => {
    const response = await post(
      server.url,
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: envelope("2026-07-28") } },
      { "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/list" }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBeNull();
    const body = (await response.json()) as { result: { tools: { name: string }[] } };
    expect(body.result.tools.map((tool) => tool.name)).toEqual(RESUME_TOOLS);
  });

  const expectUnsupported = async (response: Response, requested: string) => {
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32022, data: { supported: ["2026-07-28"], requested } },
    });
  };

  it("answers a 2025-11-25 initialize handshake with -32022", async () => {
    const response = await post(server.url, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "old", version: "1.0.0" },
      },
    });
    await expectUnsupported(response, "2025-11-25");
  });

  it("answers a 2025-11-25 request after a handshake with -32022", async () => {
    const response = await post(
      server.url,
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { "mcp-protocol-version": "2025-11-25", "mcp-session-id": "made-up" }
    );
    await expectUnsupported(response, "2025-11-25");
  });

  it.each(["2025-11-25", "2099-01-01"])(
    "answers a request whose envelope claims %s with -32022",
    async (version) => {
      const response = await post(
        server.url,
        { jsonrpc: "2.0", id: 3, method: "tools/list", params: { _meta: envelope(version) } },
        { "mcp-protocol-version": version, "mcp-method": "tools/list" }
      );
      await expectUnsupported(response, version);
    }
  );

  it("has no session stream to open or close", async () => {
    for (const method of ["GET", "DELETE"]) {
      const response = await fetch(`${server.url}/mcp`, {
        method,
        headers: { accept: "text/event-stream" },
      });
      expect(response.status).toBe(405);
    }
  });
});

describe("local mode", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer({ mode: "local" });
  });
  afterAll(() => server.close());

  it("serves the SDK client with no OAuth, as the local user", async () => {
    const result = await runMcpFlow(`${server.url}/mcp`);
    try {
      expect(result.protocolVersion).toBe("2026-07-28");
      expect(result.tools).toEqual(RESUME_TOOLS);
      // No OAuth client here, so the change log names the agent by the name it sends.
      await driveResumeFlow(result.client, server, { actorClient: "tailory-test-agent" });
    } finally {
      await result.client.close();
    }
  });

  it("has no sign-in or OAuth discovery", async () => {
    for (const path of [
      "/api/auth/get-session",
      "/.well-known/oauth-protected-resource/mcp",
      "/.well-known/oauth-authorization-server/api/auth",
    ]) {
      expect((await fetch(`${server.url}${path}`)).status).toBe(404);
    }
  });

  it("refuses a foreign Origin", async () => {
    const response = await fetch(`${server.url}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        origin: "http://evil.example",
      },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });
});
