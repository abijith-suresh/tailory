import { requireMcpAuth } from "@better-auth/mcp";
import {
  type AuthInfo,
  classifyInboundRequest,
  createMcpHandler,
  hostHeaderValidationResponse,
  isJsonContentType,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  McpServer,
  originValidationResponse,
  readRequestBody,
  UnsupportedProtocolVersionError,
} from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { authIssuer, MCP_SCOPE, mcpResource } from "./auth";
import { LOCAL_USER, schema } from "./db";
import { getAuth, getConfig, getDatabase } from "./runtime";

declare const __TAILORY_VERSION__: string;

/**
 * The MCP protocol revisions /mcp serves. Only 2026-07-28: requests carry their version and
 * capabilities in `_meta`, there is no initialize handshake and no session. A request for any
 * other revision gets the UnsupportedProtocolVersion error (-32022) listing these. To support a
 * new revision once the SDK does, add it here.
 */
export const MCP_PROTOCOL_VERSIONS: readonly string[] = ["2026-07-28"];

const version = typeof __TAILORY_VERSION__ === "string" ? __TAILORY_VERSION__ : "0.0.0";

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

/** The tools an agent gets. No resume tools yet: their names are under review in #186. */
const buildServer = (userId: string) => {
  const server = new McpServer(
    { name: "tailory", version },
    { supportedProtocolVersions: [...MCP_PROTOCOL_VERSIONS] }
  );
  server.registerTool(
    "whoami",
    {
      description: "The name of the Tailory account this agent acts for, and how Tailory runs.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const { db } = await getDatabase();
      const [user] = await db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, userId));
      if (!user) throw new Error("This account no longer exists");
      return textResult({ name: user.name, mode: getConfig().mode });
    }
  );
  return server;
};

// One handler for every request: stateless, so any instance can answer any request. 2025-era
// traffic (an initialize handshake, a session) is rejected rather than served.
const handler = createMcpHandler(
  ({ authInfo }) => {
    const userId = authInfo?.extra?.userId;
    if (typeof userId !== "string") throw new Error("MCP request has no user");
    return buildServer(userId);
  },
  {
    legacy: "reject",
    // biome-ignore lint/suspicious/noConsole: transport errors would otherwise vanish
    onerror: (error) => console.error(`[mcp] ${error.message}`),
  }
);

const unsupportedVersion = (requested: string | undefined, id: unknown) => {
  const error = new UnsupportedProtocolVersionError({
    supported: [...MCP_PROTOCOL_VERSIONS],
    requested: requested ?? "unknown",
  });
  return Response.json(
    {
      jsonrpc: "2.0",
      id: typeof id === "string" || typeof id === "number" ? id : null,
      error: { code: error.code, message: error.message, data: error.data },
    },
    { status: 400 }
  );
};

/**
 * Answers -32022 for a request naming a revision outside MCP_PROTOCOL_VERSIONS, or naming none
 * (a 2025-era request). The SDK would reject those too, but against its own list of revisions;
 * this keeps ours the one that decides. Everything else goes on to the SDK, which owns the rest
 * of the validation.
 */
const versionRejection = async (request: Request): Promise<Response | null> => {
  if (request.method !== "POST" || !isJsonContentType(request.headers.get("content-type"))) {
    return null;
  }
  let body: unknown;
  try {
    const read = await readRequestBody(request.clone());
    if (read.tooLarge) return null;
    body = JSON.parse(read.text);
  } catch {
    return null;
  }
  const outcome = classifyInboundRequest({
    httpMethod: request.method,
    protocolVersionHeader: request.headers.get("mcp-protocol-version") ?? undefined,
    mcpMethodHeader: request.headers.get("mcp-method") ?? undefined,
    mcpNameHeader: request.headers.get("mcp-name") ?? undefined,
    body,
  });
  const id = (body as { id?: unknown } | null)?.id;
  if (outcome.kind === "modern" && outcome.messageKind === "request") {
    const { revision } = outcome.classification;
    if (revision === undefined || !MCP_PROTOCOL_VERSIONS.includes(revision)) {
      return unsupportedVersion(revision, id);
    }
  }
  if (
    outcome.kind === "legacy" &&
    (outcome.reason === "initialize" || outcome.reason === "no-claim")
  ) {
    return unsupportedVersion(outcome.requestedVersion, id);
  }
  return null;
};

const serve = async (request: Request, authInfo: AuthInfo) =>
  (await versionRejection(request)) ?? handler.fetch(request, { authInfo });

const userExists = async (userId: string) => {
  const { db } = await getDatabase();
  const rows = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  return rows.length > 0;
};

/** RFC 6750 `invalid_token`, for a valid token whose account has since been deleted. */
const accountGone = (resource: string) => {
  const metadata = new URL(resource);
  metadata.pathname = `/.well-known/oauth-protected-resource${metadata.pathname}`;
  return new Response(null, {
    status: 401,
    headers: {
      "www-authenticate": `Bearer error="invalid_token", error_description="The account no longer exists", resource_metadata="${metadata.href}"`,
    },
  });
};

let protectedHandler: ((request: Request) => Promise<Response>) | undefined;
let protectedFor: unknown;

/**
 * Serves /mcp. Server mode needs an OAuth access token from Tailory's authorization server, for
 * this resource and with the `tailory` scope. Local mode needs none, but still refuses a Host or
 * Origin that isn't loopback, so a web page can't reach it.
 */
export const handleMcp = async (request: Request): Promise<Response> => {
  const config = getConfig();
  if (!config.auth) {
    const rejected =
      hostHeaderValidationResponse(request, localhostAllowedHostnames()) ??
      originValidationResponse(request, localhostAllowedOrigins());
    if (rejected) return rejected;
    return serve(request, {
      token: "local",
      clientId: "local",
      scopes: [MCP_SCOPE],
      extra: { userId: LOCAL_USER.id },
    });
  }
  const auth = await getAuth();
  if (!protectedHandler || protectedFor !== auth) {
    const resource = mcpResource(config.auth);
    protectedFor = auth;
    protectedHandler = requireMcpAuth(
      auth,
      async (req, claims) => {
        const userId = claims.sub;
        if (!userId) return new Response(null, { status: 403 });
        // Access tokens are JWTs checked by signature alone, so one outlives a deleted account
        // until it expires. Refuse it as soon as the account is gone.
        if (!(await userExists(userId))) return accountGone(resource);
        const clientId = claims.client_id ?? claims.azp;
        return serve(req, {
          token: req.headers.get("authorization")?.replace(/^\S+\s+/, "") ?? "",
          clientId: typeof clientId === "string" ? clientId : "unknown",
          scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
          resource: new URL(resource),
          extra: { userId },
        });
      },
      { resource, issuer: authIssuer(config.auth), requiredScopes: [MCP_SCOPE] }
    );
  }
  return protectedHandler(request);
};
