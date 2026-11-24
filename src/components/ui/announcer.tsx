import { createSignal } from "solid-js";

const [message, setMessage] = createSignal("");
let clearTimer: ReturnType<typeof setTimeout> | undefined;

/** Tells screen reader users about something that changed off-focus, such as a new version. */
export function announce(text: string) {
  // Clearing first makes a repeat of the same text announce again.
  setMessage("");
  queueMicrotask(() => setMessage(text));
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => setMessage(""), 5000);
}

/** The one polite live region for `announce`. Mount it once. */
export function Announcer() {
  return (
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message()}
    </div>
  );
}
