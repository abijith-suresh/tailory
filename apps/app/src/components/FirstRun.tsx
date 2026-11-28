import { Title } from "@solidjs/meta";
import { createMemo, createSignal, For, Loading, onSettled, Show } from "solid-js";

import { clientName, watchAgent } from "../lib/agent-watch";
import { getAgentConnection, getConnectInfo } from "../server/connect-functions";
import { CodeBlock } from "./CopyButton";

/** The board's columns, faint behind the cards, so you can see where applications will land. */
const COLUMNS = ["Drafting", "Applied", "Interviewing", "Closed"] as const;

/** How long the screen listens for the agent's first call. */
const LISTEN_MS = 10 * 60_000;

/**
 * The home screen of a fresh install: no profile and no applications. Two ways in: connect an
 * agent, or import a resume.
 */
export function FirstRun() {
  const info = createMemo(() => getConnectInfo());
  const [agent, setAgent] = createSignal<string | null | undefined>(undefined);

  onSettled(() => {
    const watch = watchAgent(
      getAgentConnection,
      (call) => setAgent(call ? (clientName(call) ?? "Your agent") : undefined),
      { every: 3000, for: LISTEN_MS, untilConnected: true }
    );
    return () => watch.stop();
  });

  return (
    <div class="first-run">
      <Title>Welcome · Tailory</Title>
      <div class="first-run__board" aria-hidden="true">
        <For each={COLUMNS}>{(column) => <div class="first-run__column">{column}</div>}</For>
      </div>
      <h1 class="first-run__title">Let's get your resume in</h1>
      <div class="first-run__paths">
        <section class="first-run__card" aria-labelledby="first-run-agent">
          <span class="first-run__mark" aria-hidden="true">
            A
          </span>
          <h2 class="first-run__name" id="first-run-agent">
            Connect your agent
          </h2>
          <p class="first-run__text">
            Then your agent sets up your profile and tailors each application.
          </p>
          <Loading fallback={null}>
            <CodeBlock
              code={`claude mcp add --transport http tailory ${info().mcpUrl}`}
              label="Claude Code command"
            />
          </Loading>
          <p class="first-run__state" role="status">
            <span
              class={["status-dot", agent() ? "status-dot--on" : "status-dot--wait"]}
              aria-hidden="true"
            />
            <Show when={agent()} fallback="Waiting for your agent">
              {(name) => `${name()} connected. Ask it to set up your profile.`}
            </Show>
          </p>
          <a class="link first-run__more" href="/settings/agents">
            Codex, Cursor or another client
          </a>
        </section>
        <section class="first-run__card" aria-labelledby="first-run-import">
          <span class="first-run__mark" aria-hidden="true">
            B
          </span>
          <h2 class="first-run__name" id="first-run-import">
            Import a resume
          </h2>
          <p class="first-run__text">Tailory reads it in your browser and fills in your profile.</p>
          <a class="first-run__drop" href="/profile?import">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15V4M8 8l4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
            </svg>
            <strong>Choose a file</strong>
            <small>PDF, Word or JSON Resume</small>
          </a>
        </section>
      </div>
      <p class="first-run__then">
        Then paste a job posting into your agent and say <q>Tailor my resume for this.</q>
      </p>
    </div>
  );
}
