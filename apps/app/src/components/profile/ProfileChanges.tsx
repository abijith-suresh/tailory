import { createSignal, For, onSettled, Show } from "solid-js";

import type { ChangeView } from "../../server/profile-page";
import { Button } from "../Button";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", "just now". */
export const relativeTime = (iso: string, now: number) => {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(Math.round(seconds / 60), "minute");
};

/**
 * A time as words. The server doesn't know the reader's clock or time zone, so the words appear
 * once the page runs in the browser; the exact time is in the tooltip and the datetime.
 */
function When(props: { iso: string }) {
  const [now, setNow] = createSignal<number | null>(null);
  onSettled(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  });
  return (
    <time
      datetime={props.iso}
      title={now() === null ? undefined : new Date(props.iso).toLocaleString()}
    >
      {now() === null ? "" : relativeTime(props.iso, now() as number)}
    </time>
  );
}

type ProfileChangesProps = {
  changes: readonly ChangeView[];
  onUndo: (id: string) => void;
  /** Undo is under way, or the page is busy saving. */
  busy?: boolean;
};

/** The profile's recent changes, newest first, who made each, and Undo (or Redo, after an undo) on the newest. */
export function ProfileChanges(props: ProfileChangesProps) {
  return (
    <Show
      when={props.changes.length > 0}
      fallback={
        <p class="profile-changes__empty">
          No changes yet. Edits you and your agent make show up here.
        </p>
      }
    >
      <ol class="profile-changes">
        <For each={props.changes} keyed={(change) => change.id}>
          {(item) => (
            <li class={["profile-change", { "profile-change--agent": item().byAgent }]}>
              <p class="profile-change__summary">{item().summary}</p>
              <p class="profile-change__meta">
                {item().by}
                <When iso={item().createdAt} />
              </p>
              <Show when={item().undoable}>
                <Button
                  variant="quiet"
                  class="profile-change__undo"
                  disabled={props.busy}
                  aria-label={`${item().isUndo ? "Redo" : "Undo"}: ${item().summary.replace(/^Undid: /, "")}`}
                  onClick={() => props.onUndo(item().id)}
                >
                  {item().isUndo ? "Redo" : "Undo"}
                </Button>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </Show>
  );
}
