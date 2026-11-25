import { describe, expect, it, vi } from "vitest";

import { isNotReadyError, retryWhileNotReady } from "./retry";

const refused = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });

describe("isNotReadyError", () => {
  it("recognises connection errors, directly, as a cause, or inside an AggregateError", () => {
    expect(isNotReadyError(refused)).toBe(true);
    expect(isNotReadyError(new Error("wrapped", { cause: refused }))).toBe(true);
    expect(isNotReadyError(new AggregateError([new Error("x"), refused]))).toBe(true);
    expect(isNotReadyError({ code: "57P03" })).toBe(true);
  });

  it("leaves other errors alone", () => {
    expect(isNotReadyError(new Error("syntax error"))).toBe(false);
    expect(isNotReadyError({ code: "28P01" })).toBe(false); // bad password
    expect(isNotReadyError(undefined)).toBe(false);
  });
});

describe("retryWhileNotReady", () => {
  const clock = () => {
    let time = 0;
    return {
      now: () => time,
      sleep: async (ms: number) => {
        time += ms;
      },
    };
  };

  it("retries until the call succeeds", async () => {
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(refused)
      .mockRejectedValueOnce(refused)
      .mockResolvedValue("ok");
    const onRetry = vi.fn();
    await expect(
      retryWhileNotReady(run, { timeoutMs: 30_000, intervalMs: 1_000, onRetry, ...clock() })
    ).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(2, refused, 2);
  });

  it("gives up once the time runs out", async () => {
    const run = vi.fn(() => Promise.reject(refused));
    await expect(
      retryWhileNotReady(run, { timeoutMs: 30_000, intervalMs: 1_000, ...clock() })
    ).rejects.toBe(refused);
    expect(run).toHaveBeenCalledTimes(31);
  });

  it("fails at once on other errors", async () => {
    const fatal = new Error("password authentication failed");
    const run = vi.fn(() => Promise.reject(fatal));
    await expect(
      retryWhileNotReady(run, { timeoutMs: 30_000, intervalMs: 1_000, ...clock() })
    ).rejects.toBe(fatal);
    expect(run).toHaveBeenCalledOnce();
  });

  it("waits with real timers by default", async () => {
    const run = vi.fn<() => Promise<number>>().mockRejectedValueOnce(refused).mockResolvedValue(1);
    await expect(retryWhileNotReady(run, { timeoutMs: 1_000, intervalMs: 1 })).resolves.toBe(1);
  });
});
