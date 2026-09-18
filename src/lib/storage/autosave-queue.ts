export function createSerializedTaskQueue<T>(task: (value: T) => Promise<void>) {
  let pending: Promise<void> = Promise.resolve();

  return {
    enqueue(value: T): Promise<void> {
      const current = pending.then(
        () => task(value),
        () => task(value)
      );

      pending = current.then(
        () => undefined,
        () => undefined
      );

      return current;
    },
  };
}
