import type { ResumeHighlight } from "@/types/resume";
import { createId } from "./ids";

/** Turns bullet text into bullets with new ids. */
export function toHighlights(texts: readonly string[]): ResumeHighlight[] {
  return texts.map((text) => ({ id: createId(), text }));
}
