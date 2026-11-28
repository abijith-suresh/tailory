import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgentActivity } from "../server/data";
import { watchAgent } from "./agent-watch";
import { readTheme, setTheme, THEME_KEY, THEME_SCRIPT } from "./theme";

describe("theme", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("pins light or dark on <html> and keeps it in this browser", () => {
    expect(readTheme()).toBe("system");
    setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(readTheme()).toBe("dark");
    setTheme("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("ignores a saved value it doesn't know", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    expect(readTheme()).toBe("system");
  });

  it("sets the saved theme before the page paints", () => {
    localStorage.setItem(THEME_KEY, "light");
    new Function(THEME_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("watchAgent", () => {
  afterEach(() => vi.useRealTimers());

  const call: AgentActivity = { client: "Claude Code", tool: "get_profile", calledAt: "" };

  it("asks until the agent calls, then stops", async () => {
    vi.useFakeTimers();
    const answers: (AgentActivity | null)[] = [null, null, call];
    const read = vi.fn(async () => ({
      lastCall: answers.length > 0 ? (answers.shift() ?? null) : call,
    }));
    const seen: (AgentActivity | null)[] = [];
    watchAgent(read, (result) => seen.push(result), { every: 1000, untilConnected: true });
    await vi.advanceTimersByTimeAsync(5000);
    expect(seen).toEqual([null, null, call]);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("stops when told, and when its time is up", async () => {
    vi.useFakeTimers();
    const read = vi.fn(async () => ({ lastCall: null }));
    const watch = watchAgent(read, () => {}, { every: 1000, for: 3000 });
    await vi.advanceTimersByTimeAsync(10_000);
    // At 0, 1, 2 and 3 seconds.
    expect(read).toHaveBeenCalledTimes(4);

    read.mockClear();
    const stopped = watchAgent(read, () => {}, { every: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    stopped.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(1);
    watch.stop();
  });
});
