/**
 * Scripted motion: the pieces CSS can't do alone. Timing always comes from the tokens in
 * src/styles/tokens.css, so a change there changes everything. See "Motion" in the README.
 *
 * Every helper here runs inside one page and animates elements that page owns. When the page
 * goes, its elements go with their animations, so nothing outlives a navigation.
 */
import { flush } from "solid-js";

export type DurationToken = "press" | "hover" | "exit" | "enter" | "move" | "settle";
export type EasingToken = "out" | "in" | "in-out" | "spring";

const FALLBACK_MS: Record<DurationToken, number> = {
  press: 90,
  hover: 150,
  exit: 150,
  enter: 220,
  move: 320,
  settle: 480,
};

const FALLBACK_EASING: Record<EasingToken, string> = {
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  in: "cubic-bezier(0.5, 0, 0.75, 0)",
  "in-out": "cubic-bezier(0.6, 0, 0.3, 1)",
  spring: "cubic-bezier(0.2, 0.8, 0.2, 1)",
};

const canAnimate = () =>
  typeof Element !== "undefined" && typeof Element.prototype.animate === "function";

/** Whether the person asked for less motion. False on the server. */
export const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const token = (name: string) =>
  typeof document === "undefined"
    ? ""
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** A duration token in milliseconds. Reduced motion is already in the token. */
export function duration(name: DurationToken): number {
  const value = token(`--duration-${name}`);
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value);
  if (!match) return prefersReducedMotion() ? 0 : FALLBACK_MS[name];
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

/** An easing token, ready for `Element.animate`. */
export function easing(name: EasingToken): string {
  // linear() spans several lines in the stylesheet; collapse it to one.
  return token(`--ease-${name}`).replace(/\s+/g, " ") || FALLBACK_EASING[name];
}

const running = new WeakMap<Element, Animation>();

/**
 * Plays keyframes on an element with token timing, replacing whatever this helper was already
 * playing on it. Resolves when it ends, is replaced, or straight away when there's nothing to play.
 */
export function play(
  element: Element,
  keyframes: Keyframe[],
  options: { duration?: DurationToken; easing?: EasingToken; delay?: number } = {}
): Promise<void> {
  running.get(element)?.cancel();
  const ms = duration(options.duration ?? "move");
  if (!canAnimate() || ms === 0) return Promise.resolve();
  const animation = element.animate(keyframes, {
    duration: ms,
    easing: easing(options.easing ?? "out"),
    delay: options.delay ?? 0,
  });
  running.set(element, animation);
  return animation.finished.then(
    () => {
      if (running.get(element) === animation) running.delete(element);
    },
    () => {}
  );
}

/** Children of a FLIP container that take part, by their `data-flip-key`. */
const flipChildren = (container: Element) =>
  [...container.querySelectorAll<HTMLElement>(":scope > [data-flip-key]")].map(
    (element) => [element.dataset.flipKey as string, element] as const
  );

/**
 * FLIP for a list that re-sorts. Give each child of `container` a stable `data-flip-key`, then
 * run the change through this: it measures where every child is, applies the change, and slides
 * each child from its old place to its new one. Children that are new rise into place.
 *
 *   await flip(listElement, () => setEntries(sorted));
 *
 * Returns the keys of the children that are new, so the caller can mark one as landed.
 */
export async function flip(container: HTMLElement, change: () => unknown): Promise<string[]> {
  const before = new Map<string, DOMRect>();
  // Measured mid-slide if one is still running, so a quick second change starts from where
  // things are on screen, not where they were headed.
  for (const [key, element] of flipChildren(container)) {
    before.set(key, element.getBoundingClientRect());
  }

  await change();
  flush();

  const added: string[] = [];
  const moves: Promise<void>[] = [];
  for (const [key, element] of flipChildren(container)) {
    const first = before.get(key);
    if (!first) {
      added.push(key);
      moves.push(
        play(
          element,
          [
            { opacity: 0, translate: prefersReducedMotion() ? "0 0" : "0 6px" },
            { opacity: 1, translate: "0 0" },
          ],
          { duration: "enter", easing: "out" }
        )
      );
      continue;
    }
    const last = element.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if ((Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) || prefersReducedMotion()) continue;
    moves.push(
      play(element, [{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
        duration: "move",
        easing: "out",
      })
    );
  }
  await Promise.all(moves);
  return added;
}

/**
 * Marks an element as just landed (a cobalt wash that fades) and scrolls it into view. Use it on
 * the row a person just added, after `flip` has slid it into place.
 */
export function land(element: HTMLElement) {
  element.classList.remove("motion-landed");
  // Restart the animation if it is already playing.
  void element.offsetWidth;
  element.classList.add("motion-landed");
  element.addEventListener("animationend", () => element.classList.remove("motion-landed"), {
    once: true,
  });
  element.scrollIntoView?.({
    block: "nearest",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}
