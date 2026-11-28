import type { JSX } from "@solidjs/web";
import { render } from "@solidjs/web";
import { flush } from "solid-js";

/** Mounts a component into the document for a behaviour test and returns its container. */
export function mount(code: () => JSX.Element) {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(code, container);
  flush();
  return { container, dispose };
}

/** Sends a key to whatever has focus (or the given element), then applies Solid's updates. */
export function press(key: string, options: KeyboardEventInit = {}, target?: Element | null) {
  const to = target ?? document.activeElement ?? document.body;
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options });
  to.dispatchEvent(event);
  flush();
  return event;
}

/** Clicks an element, then applies Solid's updates. */
export function click(target: Element | null | undefined) {
  (target as HTMLElement).click();
  flush();
}

/** Types into an input as a person would: sets the value and fires input. */
export function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  flush();
}
