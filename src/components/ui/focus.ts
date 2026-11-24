const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Elements inside `root` that Tab can reach, in document order. */
export function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[inert]") && !element.hasAttribute("hidden")
  );
}

/** Keeps Tab and Shift+Tab inside `root`. Returns true when it moved focus. */
export function trapTab(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.key !== "Tab") return false;
  const items = focusableIn(root);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    event.preventDefault();
    return true;
  }

  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Makes everything in <body> but `keep` inert, so a modal is the only thing a keyboard or screen
 * reader can reach. Returns a function that undoes it.
 */
export function inertOutside(keep: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (const element of document.body.children) {
    if (!(element instanceof HTMLElement) || element === keep || element.hasAttribute("inert")) {
      continue;
    }
    element.setAttribute("inert", "");
    changed.push(element);
  }
  return () => {
    for (const element of changed) element.removeAttribute("inert");
  };
}
