import { For, Show } from "solid-js";

import { fullTime, timeAgo } from "../lib/applications";
import type { ChangeView } from "../server/pages";
import { Button } from "./Button";

type ChangeListProps = {
  changes: readonly ChangeView[];
  onUndo: (change: ChangeView) => void;
  /** The change being undone, so its button can say so. */
  undoing?: string | null;
};

/** The application's change log, newest first: who, what, when, and Undo. */
export function ChangeList(props: ChangeListProps) {
  return (
    <Show when={props.changes.length > 0} fallback={<p class="panel__text">No changes yet.</p>}>
      <ol class="change-list">
        <For each={props.changes} keyed={(change) => change.id}>
          {(change) => (
            <li class="change">
              <div class="change__body">
                <p class="change__summary">{change().summary}</p>
                <p class="change__meta">
                  <span class={change().byAgent ? "change__who change__who--agent" : "change__who"}>
                    {change().who}
                  </span>
                  {" · "}
                  <time datetime={change().createdAt} title={fullTime(change().createdAt)}>
                    {timeAgo(change().createdAt)}
                  </time>
                </p>
              </div>
              <Show when={change().undoable}>
                <Button
                  variant="quiet"
                  class="change__undo"
                  disabled={Boolean(props.undoing)}
                  aria-label={`Undo: ${change().summary}`}
                  onClick={() => props.onUndo(change())}
                >
                  {props.undoing === change().id ? "Undoing…" : "Undo"}
                </Button>
              </Show>
            </li>
          )}
        </For>
      </ol>
    </Show>
  );
}
