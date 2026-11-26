/** A new random id for an entry, a bullet, or an application. */
export function createId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `generated-${Math.random().toString(36).slice(2, 10)}`;
}

/** Turns bullet text into bullets with new ids. */
export function toHighlights(texts: readonly string[]): { id: string; text: string }[] {
  return texts.map((text) => ({ id: createId(), text }));
}
