import type { Config, Mode } from "./config";

/** What the Connect an agent page shows: how Tailory runs and the address agents use. */
export type ConnectInfo = { mode: Mode; mcpUrl: string };

/**
 * The MCP endpoint agents should use. Server mode: the public URL people reach Tailory at. Local
 * mode has no public URL, so it is the loopback address this request came in on (local mode
 * refuses any other Host), which also carries the port Tailory is running on.
 */
export const mcpUrlFor = (config: Pick<Config, "mode" | "auth">, requestUrl: string) =>
  config.mode === "server" && config.auth
    ? `${config.auth.publicUrl}/mcp`
    : new URL("/mcp", requestUrl).href;
