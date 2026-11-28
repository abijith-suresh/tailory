import type { JSX } from "@solidjs/web";
import { For, Show } from "solid-js";

import type { ConnectInfo } from "../server/connect";
import { CodeBlock, CopyButton } from "./CopyButton";

/** The MCP revision the server speaks; src/server/mcp.ts holds the list. */
const MCP_REVISION = "2026-07-28";

export const EXAMPLE_PROMPTS = [
  "Set up my Tailory profile from this resume.",
  "Tailor my resume for this job: <link to the posting>",
  "What applications are still waiting on a reply?",
] as const;

const json = (value: unknown) => JSON.stringify(value, null, 2);

function Client(props: { id: string; name: string; children: JSX.Element }) {
  return (
    <section class="client" aria-labelledby={`client-${props.id}`}>
      <h3 class="client__name" id={`client-${props.id}`}>
        {props.name}
      </h3>
      <div class="client__body">{props.children}</div>
    </section>
  );
}

/**
 * The address agents use and the setup for each client, ready to copy. Every command and file
 * follows the client's own documentation as of November 2026.
 */
export function ConnectGuide(props: { info: ConnectInfo }) {
  const url = () => props.info.mcpUrl;
  const local = () => props.info.mode === "local";

  return (
    <div class="stack connect">
      <section class="panel" aria-labelledby="mcp-address">
        <h2 class="panel__title" id="mcp-address">
          Your MCP address
        </h2>
        <div class="address">
          <code class="address__url" translate="no">
            {url()}
          </code>
          <CopyButton text={url()} label="Copy the MCP address" />
        </div>
        <Show
          when={local()}
          fallback={
            <p class="panel__text">
              The first time an agent connects, it opens Tailory in your browser so you can sign in
              and allow it. No API keys.
            </p>
          }
        >
          <p class="panel__text">
            Local mode: this address only works on this computer, for agents that run here. There is
            no sign-in, and it changes if you start Tailory on another port.
          </p>
        </Show>
        <p class="panel__text">
          Tailory speaks MCP revision {MCP_REVISION} only. A client that only knows older revisions
          can't connect yet.
        </p>
      </section>

      <section class="panel" aria-labelledby="setup">
        <h2 class="panel__title" id="setup">
          Set up your agent
        </h2>
        <p class="panel__text">Pick your client and copy the setup.</p>

        <div class="clients">
          <Client id="claude-code" name="Claude Code">
            <p>Run this in a terminal:</p>
            <CodeBlock
              label="Claude Code command"
              code={`claude mcp add --transport http tailory ${url()}`}
            />
            <Show when={!local()}>
              <p>
                Then run <code>/mcp</code> in Claude Code and follow the sign-in steps in your
                browser.
              </p>
            </Show>
          </Client>

          <Client id="codex" name="Codex">
            <p>
              Add this to <code>~/.codex/config.toml</code>:
            </p>
            <CodeBlock label="Codex config.toml" code={`[mcp_servers.tailory]\nurl = "${url()}"`} />
            <Show when={!local()}>
              <p>Then sign in:</p>
              <CodeBlock label="Codex sign-in command" code="codex mcp login tailory" />
            </Show>
          </Client>

          <Client id="cursor" name="Cursor">
            <p>
              Add this to <code>~/.cursor/mcp.json</code> for every project, or to{" "}
              <code>.cursor/mcp.json</code> in one project:
            </p>
            <CodeBlock
              label="Cursor mcp.json"
              code={json({ mcpServers: { tailory: { url: url() } } })}
            />
          </Client>

          <Client id="vscode" name="VS Code">
            <p>
              Run <strong>Chat: Open Customizations</strong> from the Command Palette and open{" "}
              <strong>MCP Servers</strong>. Choose <strong>Add Server</strong> in the User group,
              pick <strong>HTTP (HTTP or Server-Sent Events)</strong>, paste the address, name it
              tailory, and choose <strong>Global</strong>, then <strong>Copilot Global</strong>.
            </p>
            <p>
              Or add this to <code>~/.copilot/mcp-config.json</code>:
            </p>
            <CodeBlock
              label="VS Code mcp-config.json"
              code={json({ mcpServers: { tailory: { type: "http", url: url() } } })}
            />
          </Client>

          <Client id="claude-ai" name="Claude.ai">
            <Show
              when={!local()}
              fallback={
                <p>
                  Claude.ai connects from Anthropic's servers, so it can't reach Tailory on your
                  computer. Use Claude Code here, or run Tailory on a server.
                </p>
              }
            >
              <p>
                Open <strong>Customize</strong>, then <strong>Connectors</strong>. Choose{" "}
                <strong>Add</strong>, then <strong>Add custom connector</strong>. Name it Tailory,
                paste the address and continue. Claude asks you to sign in to Tailory.
              </p>
              <p class="client__note">
                Claude only connects to HTTPS addresses on the standard port. On Team and Enterprise
                plans, an owner adds the connector in Organization settings first.
              </p>
            </Show>
          </Client>

          <Client id="chatgpt" name="ChatGPT">
            <Show
              when={!local()}
              fallback={
                <p>
                  ChatGPT connects from OpenAI's servers, so it can't reach Tailory on your
                  computer. Run Tailory on a server to use it.
                </p>
              }
            >
              <p>
                On the web, go to{" "}
                <a class="link" href="https://chatgpt.com/plugins" rel="noreferrer" target="_blank">
                  chatgpt.com/plugins
                </a>
                , choose <strong>+</strong>, then <strong>Add custom MCP server</strong>. Name it
                Tailory, paste the address as the connection URL, choose OAuth, and create it as a
                plugin. To use it, type <kbd>@</kbd> in a new chat and pick Tailory.
              </p>
              <p class="client__note">
                Which ChatGPT plans can add custom MCP servers, and use every tool, is up to OpenAI;
                check your plan if the option is missing.
              </p>
            </Show>
          </Client>
        </div>
      </section>

      <section class="panel" aria-labelledby="try">
        <h2 class="panel__title" id="try">
          Things to ask
        </h2>
        <p class="panel__text">
          Once it's connected, ask your agent in your own words. For example:
        </p>
        <ul class="prompts">
          <For each={EXAMPLE_PROMPTS}>
            {(prompt) => (
              <li>
                <CodeBlock label="Example prompt" code={prompt} />
              </li>
            )}
          </For>
        </ul>
      </section>
    </div>
  );
}
