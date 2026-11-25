// Postgres may still be starting when the app boots (compose, hosted platforms), so the first
// connection retries for a while on errors that mean "not reachable yet".

const notReadyCodes = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "57P03", // cannot_connect_now: the server is starting up
]);

export const isNotReadyError = (error: unknown): boolean => {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const { code, cause, errors } = current as {
      code?: unknown;
      cause?: unknown;
      errors?: unknown;
    };
    if (typeof code === "string" && notReadyCodes.has(code)) return true;
    // Node reports a refused dual-stack connect as an AggregateError of per-address errors.
    if (Array.isArray(errors) && errors.some(isNotReadyError)) return true;
    current = cause;
  }
  return false;
};

export type RetryOptions = {
  /** Give up once this much time has passed since the first attempt. */
  timeoutMs: number;
  intervalMs: number;
  onRetry?: (error: unknown, attempt: number) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export const retryWhileNotReady = async <T>(
  run: () => Promise<T>,
  {
    timeoutMs,
    intervalMs,
    onRetry,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
  }: RetryOptions
): Promise<T> => {
  const deadline = now() + timeoutMs;
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isNotReadyError(error) || now() + intervalMs > deadline) throw error;
      onRetry?.(error, attempt);
      await sleep(intervalMs);
    }
  }
};
