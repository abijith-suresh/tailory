import { describe, expect, it, vi } from "vitest";
import { createSerializedTaskQueue } from "./autosave-queue";

describe("serialized task queue", () => {
  it("runs tasks in enqueue order", async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    let resolveFirstStarted: (() => void) | undefined;
    const firstStarted = new Promise<void>((resolve) => {
      resolveFirstStarted = resolve;
    });
    const task = vi.fn(async (value: string) => {
      order.push(`start:${value}`);
      if (value === "first") {
        resolveFirstStarted?.();
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      }
      order.push(`finish:${value}`);
    });
    const queue = createSerializedTaskQueue(task);

    const first = queue.enqueue("first");
    const second = queue.enqueue("second");
    await firstStarted;

    expect(task).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["start:first"]);

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(order).toEqual(["start:first", "finish:first", "start:second", "finish:second"]);
  });

  it("continues with later tasks after a failure", async () => {
    const task = vi.fn(async (value: string) => {
      if (value === "first") throw new Error("save failed");
    });
    const queue = createSerializedTaskQueue(task);

    const first = queue.enqueue("first");
    const second = queue.enqueue("second");

    await expect(first).rejects.toThrow("save failed");
    await expect(second).resolves.toBeUndefined();
    expect(task).toHaveBeenNthCalledWith(2, "second");
  });
});
