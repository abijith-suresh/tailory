import { describe, expect, it } from "vitest";

import { AgentSetup, agentClients, MCP_REVISION } from "./AgentSetup";
import { connectedText } from "./ConnectionCheck";
import { renderHtml } from "./render.testing";

const LOCAL = "http://127.0.0.1:4413/mcp";
const HOSTED = "https://tailory.example.com/mcp";

const code = (url: string, mode: "local" | "server", id: string) =>
  agentClients(url, mode).find((client) => client.id === id)?.code;

describe("agentClients", () => {
  it("keeps each client's verified snippet, with this server's address", () => {
    for (const [url, mode] of [
      [LOCAL, "local"],
      [HOSTED, "server"],
    ] as const) {
      expect(code(url, mode, "claude-code")).toBe(`claude mcp add --transport http tailory ${url}`);
      expect(code(url, mode, "codex")).toBe(`[mcp_servers.tailory]\nurl = "${url}"`);
      expect(JSON.parse(code(url, mode, "cursor") ?? "")).toEqual({
        mcpServers: { tailory: { url } },
      });
      expect(JSON.parse(code(url, mode, "vscode") ?? "")).toEqual({
        mcpServers: { tailory: { type: "http", url } },
      });
    }
  });

  it("offers Claude.ai and ChatGPT only in server mode", () => {
    expect(agentClients(LOCAL, "local").map((client) => client.name)).toEqual([
      "Claude Code",
      "Codex",
      "Cursor",
      "VS Code",
    ]);
    expect(agentClients(HOSTED, "server").map((client) => client.name)).toEqual([
      "Claude Code",
      "Codex",
      "Cursor",
      "VS Code",
      "Claude.ai",
      "ChatGPT",
    ]);
    expect(code(HOSTED, "server", "claude-ai")).toBe(HOSTED);
    expect(code(HOSTED, "server", "chatgpt")).toBe(HOSTED);
  });

  it("adds the sign-in step in server mode only", () => {
    const doc = renderHtml(() => <AgentSetup url={HOSTED} mode="server" />);
    expect(doc.body.textContent).toContain("codex mcp login tailory");
    const local = renderHtml(() => <AgentSetup url={LOCAL} mode="local" />);
    expect(local.body.textContent).not.toContain("codex mcp login");
    expect(local.querySelectorAll('[role="tab"]')).toHaveLength(4);
  });

  it("speaks one MCP revision", () => {
    expect(MCP_REVISION).toBe("2026-07-28");
  });
});

describe("connectedText", () => {
  const now = Date.parse("2026-11-28T12:00:00Z");
  it("names the client and when it last called", () => {
    expect(
      connectedText(
        { client: "Claude Code", tool: "get_profile", calledAt: "2026-11-28T11:58:00Z" },
        now
      )
    ).toBe("Connected: Claude Code, 2 minutes ago");
    expect(
      connectedText({ client: null, tool: "get_profile", calledAt: "2026-11-28T11:59:50Z" }, now)
    ).toBe("Connected, just now");
  });
});
