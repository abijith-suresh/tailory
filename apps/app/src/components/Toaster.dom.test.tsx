import { flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearToasts, toast } from "../lib/toast";
import { click, mount } from "../testing/dom";
import { Toaster } from "./Toaster";

const visible = () => [...document.querySelectorAll(".toast:not([data-leaving])")];

describe("Toaster", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    clearToasts();
    vi.useRealTimers();
  });

  it("runs the action once, then leaves", () => {
    const undo = vi.fn();
    mount(() => <Toaster />);
    toast("Orbital Maps moved to Applied", { action: { label: "Undo", run: undo } });
    flush();
    expect(visible()).toHaveLength(1);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Orbital Maps moved to Applied"
    );

    const action = document.querySelector<HTMLButtonElement>(".toast__action");
    expect(action?.textContent).toBe("Undo");
    click(action);
    click(action);
    expect(undo).toHaveBeenCalledOnce();
    expect(visible()).toHaveLength(0);
    // It plays its exit, then it's gone.
    expect(document.querySelectorAll(".toast[data-leaving]")).toHaveLength(1);
    vi.advanceTimersByTime(500);
    flush();
    expect(document.querySelectorAll(".toast")).toHaveLength(0);
  });

  it("shows one at a time and times out, but waits while the pointer is on it", () => {
    mount(() => <Toaster />);
    toast("First");
    toast("Second", { action: { label: "Undo", run: () => {} } });
    flush();
    expect(visible().map((t) => t.querySelector(".toast__message")?.textContent)).toEqual([
      "Second",
    ]);

    const second = visible()[0];
    second.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(10_000);
    flush();
    expect(visible()).toHaveLength(1);

    second.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(6_000);
    flush();
    expect(visible()).toHaveLength(0);
  });

  it("keeps errors until dismissed, and says them at once", () => {
    mount(() => <Toaster />);
    toast("Couldn't save", { tone: "error", action: { label: "Retry", run: () => {} } });
    flush();
    vi.advanceTimersByTime(60_000);
    flush();
    expect(visible()).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("Couldn't save");
    click(document.querySelector(".toast__close"));
    expect(visible()).toHaveLength(0);
  });

  it("clears at once on navigation, with nothing left playing", () => {
    mount(() => <Toaster />);
    toast("Saved");
    toast("Moved");
    flush();
    clearToasts();
    flush();
    expect(document.querySelectorAll(".toast")).toHaveLength(0);
  });
});
