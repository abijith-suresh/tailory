import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

import type { Mode } from "../server/config";
import { CodeBlock } from "./CopyButton";
import { type Tab, Tabs } from "./Tabs";

/** The MCP revision the server speaks; src/server/mcp.ts holds the list. */
export const MCP_REVISION = "2026-07-28";

/** The full setup guide. A placeholder until the docs site exists. */
export const SETUP_GUIDE_URL = "https://tailory.dev/docs/agents";

const json = (value: unknown) => JSON.stringify(value, null, 2);

export type AgentClient = {
  id: string;
  name: string;
  /** One line saying where the snippet goes. */
  how: () => JSX.Element;
  /** What to copy. */
  code: string;
  label: string;
  /** A second step, when the client needs one. */
  next?: () => JSX.Element;
};

/**
 * The setup for each agent client, one instruction and one thing to copy. Every command and file
 * follows the client's own documentation as of November 2026. Claude.ai and ChatGPT connect from
 * their makers' servers, so they only work when Tailory runs on a server.
 */
export function agentClients(url: string, mode: Mode): AgentClient[] {
  const server = mode === "server";
  const clients: AgentClient[] = [
    {
      id: "claude-code",
      name: "Claude Code",
      how: () => "Run in a terminal:",
      code: `claude mcp add --transport http tailory ${url}`,
      label: "Claude Code command",
      next: server
        ? () => (
            <>
              Then run <code>/mcp</code> in Claude Code and sign in.
            </>
          )
        : undefined,
    },
    {
      id: "codex",
      name: "Codex",
      how: () => (
        <>
          Add to <code>~/.codex/config.toml</code>:
        </>
      ),
      code: `[mcp_servers.tailory]\nurl = "${url}"`,
      label: "Codex config.toml",
      next: server
        ? () => (
            <>
              Then sign in with <code>codex mcp login tailory</code>.
            </>
          )
        : undefined,
    },
    {
      id: "cursor",
      name: "Cursor",
      how: () => (
        <>
          Add to <code>~/.cursor/mcp.json</code>:
        </>
      ),
      code: json({ mcpServers: { tailory: { url } } }),
      label: "Cursor mcp.json",
    },
    {
      id: "vscode",
      name: "VS Code",
      how: () => (
        <>
          Add to <code>~/.copilot/mcp-config.json</code>:
        </>
      ),
      code: json({ mcpServers: { tailory: { type: "http", url } } }),
      label: "VS Code mcp-config.json",
    },
  ];
  if (!server) return clients;
  return [
    ...clients,
    {
      id: "claude-ai",
      name: "Claude.ai",
      how: () => (
        <>
          In <strong>Customize › Connectors</strong>, choose <strong>Add custom connector</strong>,
          name it Tailory and paste:
        </>
      ),
      code: url,
      label: "Claude.ai connector URL",
      next: () => "Claude only connects to HTTPS addresses on the standard port.",
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      how: () => (
        <>
          At{" "}
          <a class="link" href="https://chatgpt.com/plugins" rel="noreferrer" target="_blank">
            chatgpt.com/plugins
          </a>
          , choose <strong>+ › Add custom MCP server</strong>, name it Tailory, choose OAuth and
          paste:
        </>
      ),
      code: url,
      label: "ChatGPT connection URL",
    },
  ];
}

/** One tab per agent client, each with its line of setup to copy. */
export function AgentSetup(props: { url: string; mode: Mode }) {
  const tabs = (): Tab[] =>
    agentClients(props.url, props.mode).map((client) => ({
      id: client.id,
      label: client.name,
      content: () => (
        <div class="agent-setup">
          <p class="agent-setup__how">{client.how()}</p>
          <CodeBlock code={client.code} label={client.label} />
          <Show when={client.next}>{(next) => <p class="agent-setup__then">{next()()}</p>}</Show>
        </div>
      ),
    }));
  return <Tabs label="Agent client" tabs={tabs()} class="agent-tabs" />;
}
