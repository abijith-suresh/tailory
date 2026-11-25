import { requireMcpAuth } from "@better-auth/mcp";
import {
  createMcpHandler,
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "./auth";
import { MCP_SCOPE } from "./auth-options";
import { LOCAL_USER_ID, mode, siteUrl } from "./config";
import { getDb, schema } from "./db";
import { renderResumePdf } from "./pdf";

const buildServer = (userId: string) => {
  const server = new McpServer({ name: "tailory", version: "0.0.0-spike" });
  server.registerTool(
    "get_profile",
    {
      description: "Return the signed-in user's profile and resume titles.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const { db, driver } = await getDb();
      const [user] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
      const resumes = await db
        .select({ id: schema.resume.id, title: schema.resume.title })
        .from(schema.resume)
        .where(eq(schema.resume.userId, userId));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              id: user?.id,
              name: user?.name,
              email: user?.email,
              resumes,
              driver,
            }),
          },
        ],
      };
    }
  );
  server.registerTool(
    "export_pdf",
    {
      description: "Render the sample resume to PDF on the server and return its size.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const { buffer, ms } = await renderResumePdf();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              bytes: buffer.length,
              ms,
              head: buffer.subarray(0, 8).toString("latin1"),
            }),
          },
        ],
      };
    }
  );
  return server;
};

const handler = createMcpHandler(
  ({ authInfo }) => {
    const userId = authInfo?.extra?.["userId"];
    if (typeof userId !== "string") throw new Error("MCP identity missing");
    return buildServer(userId);
  },
  { onerror: (e) => console.error("[mcp]", e.message) }
);

let protectedHandler: ((req: Request) => Promise<Response>) | undefined;

export async function handleMcp(request: Request): Promise<Response> {
  if (mode === "local") {
    // No OAuth on loopback, but still block DNS rebinding and browser CSRF.
    const rejected =
      hostHeaderValidationResponse(request, localhostAllowedHostnames()) ??
      originValidationResponse(request, localhostAllowedOrigins());
    if (rejected) return rejected;
    return handler.fetch(request, {
      authInfo: {
        token: "local",
        clientId: "local",
        scopes: [MCP_SCOPE],
        extra: { userId: LOCAL_USER_ID },
      },
    });
  }
  if (!protectedHandler) {
    const auth = await getAuth();
    protectedHandler = requireMcpAuth(
      auth,
      (req, claims) => {
        const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        return handler.fetch(req, {
          authInfo: {
            token,
            clientId: String(claims["azp"] ?? claims["client_id"] ?? "unknown"),
            scopes: typeof claims["scope"] === "string" ? claims["scope"].split(" ") : [],
            resource: new URL(`${siteUrl}/mcp`),
            extra: { userId: claims.sub },
          },
        });
      },
      { resource: `${siteUrl}/mcp`, issuer: `${siteUrl}/api/auth`, requiredScopes: [MCP_SCOPE] }
    );
  }
  return protectedHandler(request);
}
