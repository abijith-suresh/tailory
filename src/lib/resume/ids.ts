/** A new random id for an entry, a bullet, or a version. */
export function createId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `generated-${Math.random().toString(36).slice(2, 10)}`;
}
