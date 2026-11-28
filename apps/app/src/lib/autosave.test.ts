import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AutosaveStatus, createAutosave, type SaveOutcome } from "./autosave";

/** A save the test settles by hand, recording what each call sent. */
const harness = (outcomes: SaveOutcome[] = []) => {
  const statuses: AutosaveStatus[] = [];
  const sent: number[] = [];
  let version = 0;
  const save = vi.fn(async () => {
    sent.push(version);
    return outcomes.shift() ?? "saved";
  });
  const autosave = createAutosave({ save, onStatus: (s) => statuses.push(s), delay: 800 });
  const edit = () => {
    version += 1;
    autosave.changed();
  };
  return { autosave, save, sent, statuses, edit };
};

describe("createAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves once, with the latest edit, after typing pauses", async () => {
    const { save, sent, statuses, edit } = harness();
    edit();
    await vi.advanceTimersByTimeAsync(500);
    edit();
    await vi.advanceTimersByTimeAsync(500);
    edit();
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800);
    expect(sent).toEqual([3]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("sends edits made during a save in the next one", async () => {
    let finish: (outcome: SaveOutcome) => void = () => {};
    const statuses: AutosaveStatus[] = [];
    const save = vi
      .fn<() => Promise<SaveOutcome>>()
      .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
      .mockResolvedValue("saved");
    const autosave = createAutosave({ save, onStatus: (s) => statuses.push(s) });
    autosave.changed();
    await vi.advanceTimersByTimeAsync(800);
    autosave.changed(); // while the first save is out
    finish("saved");
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses.at(-1)).toBe("unsaved");
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("flush saves straight away and waits for it", async () => {
    const { autosave, save, edit } = harness();
    edit();
    expect(autosave.pending()).toBe(true);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.pending()).toBe(false);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed save's edits for the next edit, without retrying on its own", async () => {
    const { autosave, save, statuses, edit } = harness(["failed"]);
    edit();
    await vi.advanceTimersByTimeAsync(800);
    expect(statuses.at(-1)).toBe("error");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(autosave.pending()).toBe(true);
    edit();
    await vi.advanceTimersByTimeAsync(800);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("treats a save that throws as failed", async () => {
    const statuses: AutosaveStatus[] = [];
    const autosave = createAutosave({
      save: () => Promise.reject(new Error("offline")),
      onStatus: (s) => statuses.push(s),
    });
    autosave.changed();
    await autosave.flush();
    expect(statuses.at(-1)).toBe("error");
  });

  it("stops on a conflict until the editor resets or retries", async () => {
    const { autosave, save, statuses, edit } = harness(["conflict"]);
    edit();
    await vi.advanceTimersByTimeAsync(800);
    expect(statuses.at(-1)).toBe("conflict");
    edit();
    await vi.advanceTimersByTimeAsync(5_000);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("conflict");

    await autosave.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("reset drops waiting edits", async () => {
    const { autosave, save, edit } = harness();
    edit();
    autosave.reset();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(save).not.toHaveBeenCalled();
    expect(autosave.pending()).toBe(false);
  });
});
