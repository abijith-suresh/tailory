import {
  Client,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from "@modelcontextprotocol/client";

// A scripted MCP client (SDK 2.x, protocol 2026-07-28) and a scripted browser for the OAuth
// steps a person would click through: the browser holds a Tailory session cookie and allows the
// consent screen the way the consent page does.

export const REDIRECT_URL = "http://127.0.0.1:4424/callback";

/** Where the test pretends to host its Client ID Metadata Document. */
export const CIMD_CLIENT_ID = "https://agent.tailory-test.dev/oauth/client.json";

export const cimdDocument = {
  client_id: CIMD_CLIENT_ID,
  client_name: "Tailory test agent (CIMD)",
  redirect_uris: [REDIRECT_URL],
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
};

/** Serves the CIMD document in place of the network, for Better Auth's metadata fetch. */
export const fetchCimdDocument = async (input: RequestInfo | URL) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== CIMD_CLIENT_ID) return new Response("Not found", { status: 404 });
  return Response.json(cimdDocument, { headers: { "cache-control": "max-age=60" } });
};

/** Creates an email account and returns its session cookie. */
export const signUp = async (origin: string, name: string) => {
  const response = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      email: `${name.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}@example.com`,
      password: "correct horse battery staple",
      name,
    }),
  });
  if (!response.ok)
    throw new Error(`sign-up answered ${response.status}: ${await response.text()}`);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
};

export type FlowLog = {
  registeredClientId?: string;
  accessToken?: string;
  authorizeRedirect?: string;
  callback?: URLSearchParams;
  scope?: string;
};

/** The OAuth client side of an MCP agent, with a signed-in browser behind it. */
const agentProvider = (
  origin: string,
  cookie: string,
  registration: "dcr" | "cimd",
  log: FlowLog
): OAuthClientProvider => {
  let client: { client_id: string } | undefined;
  let tokens: Awaited<ReturnType<OAuthClientProvider["tokens"]>>;
  let verifier = "";
  let discovery: OAuthDiscoveryState | undefined;
  return {
    redirectUrl: REDIRECT_URL,
    ...(registration === "cimd" ? { clientMetadataUrl: CIMD_CLIENT_ID } : {}),
    clientMetadata: {
      client_name: "Tailory test agent (DCR)",
      redirect_uris: [REDIRECT_URL],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    clientInformation: () => client,
    saveClientInformation: (info) => {
      client = info;
      log.registeredClientId = info.client_id;
    },
    tokens: () => tokens,
    saveTokens: (saved) => {
      tokens = saved;
      log.scope = saved.scope;
      log.accessToken = saved.access_token;
    },
    saveCodeVerifier: (value) => {
      verifier = value;
    },
    codeVerifier: () => verifier,
    saveDiscoveryState: (state) => {
      discovery = state;
    },
    discoveryState: () => discovery,
    async redirectToAuthorization(url) {
      // Node's fetch sends `sec-fetch-mode: cors`, so Better Auth answers with JSON naming the
      // next URL instead of a 302. A browser gets the 302.
      const authorize = await fetch(url, {
        headers: { cookie, accept: "text/html" },
        redirect: "manual",
      });
      let next = new URL(
        authorize.headers.get("location") ?? ((await authorize.json()) as { url: string }).url,
        origin
      );
      log.authorizeRedirect = next.pathname;
      if (next.pathname === "/oauth/consent") {
        // What the consent page sends when the person clicks Allow.
        const consent = await fetch(`${origin}/api/auth/oauth2/consent`, {
          method: "POST",
          headers: { cookie, origin, "content-type": "application/json" },
          body: JSON.stringify({ accept: true, oauth_query: next.search.slice(1) }),
        });
        const body = (await consent.json()) as { url?: string };
        if (!consent.ok || !body.url) {
          throw new Error(`consent answered ${consent.status}: ${JSON.stringify(body)}`);
        }
        next = new URL(body.url);
      }
      log.callback = next.searchParams;
    },
  };
};

export type FlowResult = {
  /** Connected and ready; close it when done. */
  client: Client;
  protocolVersion: string | undefined;
  tools: string[];
  log: FlowLog;
};

/** A tool call's answer: the text, the structured content, and whether it is an error. */
export type ToolAnswer = {
  isError: boolean;
  text: string;
  // biome-ignore lint/suspicious/noExplicitAny: tests read whatever shape each tool answers with
  data: any;
};

export const callTool = async (
  client: Client,
  name: string,
  args: Record<string, unknown> = {}
): Promise<ToolAnswer> => {
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as { type: string; text: string }[];
  return {
    isError: result.isError === true,
    text: first?.text ?? "",
    data: result.structuredContent ?? null,
  };
};

/**
 * Connects to /mcp, signing in first when `oauth` is given: discovery from the 401, client
 * registration (DCR or CIMD), authorization with consent, code exchange with the RFC 9207 `iss`
 * check, then `tools/list`. The caller closes the client.
 */
export const runMcpFlow = async (
  mcpUrl: string,
  oauth?: { cookie: string; registration: "dcr" | "cimd" }
): Promise<FlowResult> => {
  const origin = new URL(mcpUrl).origin;
  const log: FlowLog = {};
  const authProvider = oauth
    ? agentProvider(origin, oauth.cookie, oauth.registration, log)
    : undefined;
  const connect = async () => {
    // SDK 2.x clients speak 2025 unless told otherwise; `auto` probes with `server/discover`.
    const client = new Client(
      { name: "tailory-test-agent", version: "1.0.0" },
      { versionNegotiation: { mode: "auto" } }
    );
    await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider }));
    return client;
  };
  let client: Client;
  try {
    client = await connect();
  } catch (error) {
    if (!(error instanceof UnauthorizedError) || !log.callback) throw error;
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider });
    // Passing the whole callback query lets the SDK check `iss` before redeeming the code.
    await transport.finishAuth(log.callback);
    client = await connect();
  }
  const { tools } = await client.listTools();
  return {
    client,
    protocolVersion: client.getNegotiatedProtocolVersion(),
    tools: tools.map((tool) => tool.name),
    log,
  };
};
