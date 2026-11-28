/**
 * Watches for the agent's last MCP call by asking the server every few seconds, for a while.
 * Settings › Agents and the first-run screen use it. It stops on its own when the time is up or
 * the page that started it goes (the caller passes `stop` to onCleanup).
 */
import type { AgentActivity } from "../server/data";

export type AgentWatch = { stop: () => void };

export function watchAgent(
  read: () => Promise<{ lastCall: AgentActivity | null }>,
  onResult: (lastCall: AgentActivity | null) => void,
  options: { every?: number; for?: number; untilConnected?: boolean } = {}
): AgentWatch {
  const every = options.every ?? 3000;
  const until = Date.now() + (options.for ?? 60_000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const tick = async () => {
    let lastCall: AgentActivity | null = null;
    try {
      ({ lastCall } = await read());
    } catch {
      // A failed check counts as no answer; the next tick tries again.
    }
    if (stopped) return;
    onResult(lastCall);
    if ((lastCall && options.untilConnected) || Date.now() + every > until) return;
    timer = setTimeout(() => void tick(), every);
  };
  void tick();

  return {
    stop: () => {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/** "Claude Code" for a named client; null when the agent didn't give a name. */
export const clientName = (call: AgentActivity) => call.client?.trim() || null;
