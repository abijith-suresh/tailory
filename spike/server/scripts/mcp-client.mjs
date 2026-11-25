// Spike MCP client. Local mode: plain connect. Hosted/selfhost: full OAuth
// (discovery → DCR → authorize → consent → token) with a scripted "browser"
// that holds a Better Auth session cookie.
//
//   node scripts/mcp-client.mjs http://localhost:4413/mcp
//   node scripts/mcp-client.mjs http://localhost:4415/mcp --oauth
import {
  Client,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from "@modelcontextprotocol/client";

const mcpUrl = new URL(process.argv[2] ?? "http://localhost:4413/mcp");
const origin = mcpUrl.origin;
const oauth = process.argv.includes("--oauth");
const log = (...a) => console.log("[client]", ...a);

async function signUp() {
  const email = `spike+${Date.now()}@example.com`;
  const res = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "correct horse battery", name: "Spike User" }),
  });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  log("sign-up", res.status, email, cookie ? "got session cookie" : "NO COOKIE");
  if (!res.ok) throw new Error(await res.text());
  return cookie;
}

function browserProvider(cookie) {
  const store = {};
  let callback;
  return {
    get callback() {
      return callback;
    },
    redirectUrl: "http://127.0.0.1:4416/callback",
    clientMetadata: {
      client_name: "tailory-spike-client",
      redirect_uris: ["http://127.0.0.1:4416/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "openid offline_access resume:read",
    },
    clientInformation: () => store.client,
    saveClientInformation: (c) => {
      store.client = c;
      log("registered client", c.client_id);
    },
    tokens: () => store.tokens,
    saveTokens: (t) => {
      store.tokens = t;
      log("got tokens", Object.keys(t).join(","), "scope=", t.scope);
    },
    saveCodeVerifier: (v) => {
      store.verifier = v;
    },
    codeVerifier: () => store.verifier,
    async redirectToAuthorization(url) {
      log("authorize →", url.pathname);
      // Node's fetch always sends sec-fetch-mode: cors, so Better Auth answers
      // {redirect,url} JSON instead of a 302. A browser would get the 302.
      const res = await fetch(url, {
        headers: { cookie, accept: "text/html" },
        redirect: "manual",
      });
      const target = res.headers.get("location") ?? (await res.json()).url;
      let loc = new URL(target, origin);
      log("  redirected to", loc.pathname);
      if (loc.pathname === "/consent") {
        const consent = await fetch(`${origin}/api/auth/oauth2/consent`, {
          method: "POST",
          headers: { cookie, "content-type": "application/json", origin },
          body: JSON.stringify({ accept: true, oauth_query: loc.search.slice(1) }),
        });
        const body = await consent.json();
        log("  consent", consent.status);
        loc = new URL(body.url ?? body.redirect_uri);
      }
      callback = loc.searchParams;
      log("  callback has code:", callback.has("code"));
    },
  };
}

async function main() {
  const provider = oauth ? browserProvider(await signUp()) : undefined;
  if (oauth) {
    const prm = await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`).then((r) =>
      r.json()
    );
    log("protected resource metadata", JSON.stringify(prm));
    const asm = await fetch(`${origin}/.well-known/oauth-authorization-server/api/auth`);
    const asmJson = await asm.json();
    log(
      "auth server metadata",
      asm.status,
      "issuer=",
      asmJson.issuer,
      "registration_endpoint=",
      asmJson.registration_endpoint,
      "cimd=",
      asmJson.client_id_metadata_document_supported
    );
    const unauth = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: "{}",
    });
    log("unauthenticated POST /mcp", unauth.status, unauth.headers.get("www-authenticate"));
  }
  let transport = new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider });
  let client = new Client({ name: "tailory-spike-client", version: "0.0.0" });
  try {
    await client.connect(transport);
  } catch (error) {
    if (!(error instanceof UnauthorizedError) || !provider?.callback) throw error;
    await transport.finishAuth(provider.callback);
    transport = new StreamableHTTPClientTransport(mcpUrl, { authProvider: provider });
    client = new Client({ name: "tailory-spike-client", version: "0.0.0" });
    await client.connect(transport);
  }
  log("connected; server =", JSON.stringify(client.getServerVersion()));
  const tools = await client.listTools();
  log("tools:", tools.tools.map((t) => t.name).join(", "));
  for (const name of ["get_profile", "export_pdf"]) {
    const r = await client.callTool({ name, arguments: {} });
    log(name, "→", r.content[0].text);
  }
  await client.close();
}

main().catch((e) => {
  console.error("[client] FAILED", e);
  process.exit(1);
});
