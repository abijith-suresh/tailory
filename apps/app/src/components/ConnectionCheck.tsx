import { createSignal, onCleanup, Show } from "solid-js";

import { type AgentWatch, clientName, watchAgent } from "../lib/agent-watch";
import { timeAgo } from "../lib/applications";
import type { AgentActivity } from "../server/data";
import { Button } from "./Button";

type Read = () => Promise<{ lastCall: AgentActivity | null }>;

/** "Connected: Claude Code, 2 minutes ago". */
export const connectedText = (call: AgentActivity, now = Date.now()) => {
  const name = clientName(call);
  const when = timeAgo(call.calledAt, now);
  return name ? `Connected: ${name}, ${when}` : `Connected, ${when}`;
};

/**
 * Check connection: asks for the agent's last MCP call, then keeps listening for a minute, so
 * running the setup and calling a tool shows up here without another click.
 */
export function ConnectionCheck(props: { read: Read }) {
  const [state, setState] = createSignal<"idle" | "checking" | "done">("idle");
  const [lastCall, setLastCall] = createSignal<AgentActivity | null>(null);
  const [now, setNow] = createSignal(Date.now());
  let watch: AgentWatch | undefined;
  onCleanup(() => watch?.stop());

  const check = () => {
    watch?.stop();
    setState("checking");
    watch = watchAgent(
      props.read,
      (call) => {
        setNow(Date.now());
        setLastCall(call);
        setState("done");
      },
      { every: 3000, for: 60_000 }
    );
  };

  const tone = () => (state() !== "done" ? "idle" : lastCall() ? "on" : "off");

  return (
    <div class="connection-check">
      <p class="connection-check__state" role="status">
        <span class={["status-dot", `status-dot--${tone()}`]} aria-hidden="true" />
        <Show
          when={state() === "done"}
          fallback={state() === "checking" ? "Checking…" : "Not checked yet"}
        >
          <Show when={lastCall()} fallback="No agent has connected yet">
            {(call) => connectedText(call(), now())}
          </Show>
        </Show>
      </p>
      <Button busy={state() === "checking"} onClick={check}>
        {state() === "idle" ? "Check connection" : "Check again"}
      </Button>
    </div>
  );
}
