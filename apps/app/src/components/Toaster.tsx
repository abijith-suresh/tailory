import { For, Show } from "solid-js";

import { actOnToast, dismissToast, pauseToast, resumeToast, toasts } from "../lib/toast";
import { Icon } from "./Icon";

/**
 * Where toasts show. The shell renders one, after the page, so Tab reaches a toast's action from
 * the end of the page. Two live regions read new toasts out: polite for news, assertive for errors.
 */
export function Toaster() {
  const latest = (tone: "neutral" | "error") =>
    toasts().findLast((toast) => !toast.leaving && toast.tone === tone)?.message ?? "";

  return (
    <section class="toaster" aria-label="Notifications">
      <div class="visually-hidden" role="status" aria-live="polite">
        {latest("neutral")}
      </div>
      <div class="visually-hidden" role="alert" aria-live="assertive">
        {latest("error")}
      </div>
      {/* Keyed by id: a toast keeps its element while it leaves, so its entrance never replays. */}
      <For each={toasts()} keyed={(toast) => toast.id}>
        {(toast) => (
          <div
            class={["toast", { "toast--error": toast().tone === "error" }]}
            data-leaving={toast().leaving ? "" : undefined}
            onPointerEnter={() => pauseToast(toast().id)}
            onPointerLeave={() => resumeToast(toast().id)}
            onFocusIn={() => pauseToast(toast().id)}
            onFocusOut={() => resumeToast(toast().id)}
          >
            <span class="toast__message">{toast().message}</span>
            <Show when={toast().action}>
              {(action) => (
                <button type="button" class="toast__action" onClick={() => actOnToast(toast().id)}>
                  {action().label}
                </button>
              )}
            </Show>
            <button
              type="button"
              class="toast__close"
              aria-label="Dismiss"
              onClick={() => dismissToast(toast().id)}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
      </For>
    </section>
  );
}
