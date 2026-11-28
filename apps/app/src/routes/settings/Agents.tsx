import { createMemo, Loading, Show } from "solid-js";

import { AgentSetup, MCP_REVISION, SETUP_GUIDE_URL } from "../../components/AgentSetup";
import { ConnectionCheck } from "../../components/ConnectionCheck";
import { CopyButton } from "../../components/CopyButton";
import { getAgentConnection, getConnectInfo } from "../../server/connect-functions";

export default function Agents() {
  const info = createMemo(() => getConnectInfo());
  return (
    <>
      <h2 class="settings__title">Agents</h2>
      <Loading fallback={<p class="loading-note">Loading…</p>}>
        <section class="settings-block" aria-labelledby="mcp-address">
          <h3 class="settings-block__label" id="mcp-address">
            MCP server
          </h3>
          <div class="address">
            <code class="address__url" translate="no">
              {info().mcpUrl}
            </code>
            <CopyButton text={info().mcpUrl} label="Copy the MCP address" />
          </div>
          <Show when={info().mode === "local"}>
            <p class="settings-block__note">Only agents on this computer can reach it.</p>
          </Show>
        </section>

        <section class="settings-block" aria-label="Set up your agent">
          <AgentSetup url={info().mcpUrl} mode={info().mode} />
        </section>

        <section class="settings-block" aria-label="Connection">
          <ConnectionCheck read={getAgentConnection} />
        </section>

        <p class="settings__foot">
          <a class="settings__guide link" href={SETUP_GUIDE_URL} rel="noreferrer" target="_blank">
            Full setup guide
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3h7v7M13 3 5 11" />
            </svg>
          </a>
          <span>Tailory speaks MCP {MCP_REVISION} only.</span>
        </p>
      </Loading>
    </>
  );
}
