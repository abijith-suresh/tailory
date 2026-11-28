import { createSignal, For, Show } from "solid-js";

import type { ApplicationEditInput, LineView, SectionView } from "../server/pages";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";

export type SaveEdit = (edit: ApplicationEditInput) => Promise<boolean>;

const lineKey = (line: Pick<LineView, "itemId" | "field">) => `${line.itemId}:${line.field}`;

const FIELD_LABELS: Record<string, string> = {
  label: "Headline",
  summary: "Summary",
  text: "Bullet",
};

/**
 * One line of text, with its own wording for this application. Shows the profile text the
 * wording was based on, and says when the profile has changed since.
 */
function Line(props: { line: LineView; disabled?: boolean; onSave: SaveEdit }) {
  const [editing, setEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const reworded = () => props.line.baseText !== null;
  const id = () => `line-${lineKey(props.line).replace(/[^a-zA-Z0-9-]/g, "-")}`;

  // Elements are looked up by id: refs taken during hydration can miss the element on the page.
  const byId = <T extends HTMLElement>(suffix: string) =>
    document.getElementById(`${id()}-${suffix}`) as T | null;
  const open = () => {
    setEditing(true);
    queueMicrotask(() => {
      byId<HTMLTextAreaElement>("input")?.focus();
      byId<HTMLTextAreaElement>("input")?.select();
    });
  };
  const close = () => {
    setEditing(false);
    queueMicrotask(() => byId("reword")?.focus());
  };
  const save = async (text: string) => {
    setSaving(true);
    const ok = await props.onSave({
      type: "reword",
      itemId: props.line.itemId,
      field: props.line.field,
      text,
    });
    setSaving(false);
    if (ok) close();
  };

  return (
    <div class={["line", { "line--reworded": reworded(), "line--stale": props.line.stale }]}>
      <Show
        when={editing()}
        fallback={
          <div class="line__view">
            <p class="line__text" id={`${id()}-text`}>
              {props.line.text}
            </p>
            <div class="line__actions">
              <Show when={reworded()}>
                <span class="tag tag--accent">Reworded</span>
              </Show>
              <Show when={props.line.stale}>
                <span class="tag tag--warning">Profile changed</span>
              </Show>
              <Button
                id={`${id()}-reword`}
                variant="quiet"
                class="button--small"
                disabled={props.disabled}
                aria-describedby={`${id()}-text`}
                onClick={open}
              >
                Reword
              </Button>
            </div>
            <Show when={props.line.stale}>
              <p class="line__note">
                Your profile now says: <q>{props.line.profileText}</q>
              </p>
            </Show>
          </div>
        }
      >
        <form
          class="line__form"
          onSubmit={(event) => {
            event.preventDefault();
            void save(byId<HTMLTextAreaElement>("input")?.value ?? "");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        >
          <label class="field__label" for={`${id()}-input`}>
            {FIELD_LABELS[props.line.field] ?? "Wording"} for this application
          </label>
          <textarea
            id={`${id()}-input`}
            class="input textarea"
            rows={2}
            aria-describedby={`${id()}-base`}
          >
            {props.line.text}
          </textarea>
          <p class="field__hint" id={`${id()}-base`}>
            Profile: <q>{props.line.baseText ?? props.line.profileText}</q>
            <Show when={props.line.stale}>
              {" "}
              (now <q>{props.line.profileText}</q>)
            </Show>
          </p>
          <div class="line__buttons">
            <Button type="submit" variant="primary" class="button--small" disabled={saving()}>
              Save
            </Button>
            <Show when={reworded()}>
              <Button class="button--small" disabled={saving()} onClick={() => void save("")}>
                Use the profile's wording
              </Button>
            </Show>
            <Button variant="quiet" class="button--small" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </Show>
    </div>
  );
}

const include = (onSave: SaveEdit, itemId: string, included: boolean) =>
  void onSave({ type: "include", itemId, included });

/** The profile by section: what this application keeps, and its own wording for each line. */
export function ResumeTree(props: { sections: readonly SectionView[]; onSave: SaveEdit }) {
  return (
    <div class="tree">
      <For each={props.sections} keyed={(section) => section.id}>
        {(section) => (
          <fieldset class="tree__section">
            <legend class="tree__legend">{section().label}</legend>
            <For each={section().lines} keyed={lineKey}>
              {(line) => <Line line={line()} onSave={props.onSave} />}
            </For>
            <ul class="tree__entries">
              <For each={section().entries} keyed={(entry) => entry.id}>
                {(entry) => (
                  <li class={["tree__entry", { "tree__entry--out": !entry().included }]}>
                    <Checkbox
                      checked={entry().included}
                      onChange={(event) =>
                        include(props.onSave, entry().id, event.currentTarget.checked)
                      }
                      label={
                        <>
                          <span class="tree__title">{entry().title}</span>
                          <Show when={entry().detail}>
                            <span class="tree__detail">{entry().detail}</span>
                          </Show>
                        </>
                      }
                    />
                    <Show when={entry().lines.length > 0 || entry().bullets.length > 0}>
                      <div class="tree__children">
                        <For each={entry().lines} keyed={lineKey}>
                          {(line) => (
                            <Line
                              line={line()}
                              disabled={!entry().included}
                              onSave={props.onSave}
                            />
                          )}
                        </For>
                        <ul class="tree__bullets">
                          <For each={entry().bullets} keyed={(bullet) => bullet.id}>
                            {(bullet) => (
                              <li
                                class={[
                                  "tree__bullet",
                                  { "tree__bullet--out": !entry().included || !bullet().included },
                                ]}
                              >
                                <input
                                  type="checkbox"
                                  class="checkbox__input"
                                  checked={bullet().included}
                                  disabled={!entry().included}
                                  aria-label={`Keep: ${bullet().text}`}
                                  onChange={(event) =>
                                    include(props.onSave, bullet().id, event.currentTarget.checked)
                                  }
                                />
                                <Line
                                  line={bullet()}
                                  disabled={!entry().included || !bullet().included}
                                  onSave={props.onSave}
                                />
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </fieldset>
        )}
      </For>
    </div>
  );
}

/** The sections that print, in order, each with Move up and Move down. */
export function SectionOrder(props: {
  order: readonly { id: string; key: string; label: string }[];
  onSave: SaveEdit;
}) {
  const move = async (key: string, direction: -1 | 1, button: HTMLButtonElement) => {
    await props.onSave({
      type: "move-section",
      section: key as Extract<ApplicationEditInput, { type: "move-section" }>["section"],
      direction,
    });
    // Keep focus on the section that moved, or its other button at the top or bottom.
    queueMicrotask(() => {
      const row = document.querySelector<HTMLElement>(`[data-section="${key}"]`);
      const same = row?.querySelector<HTMLButtonElement>(`[data-direction="${direction}"]`);
      const target = same && !same.disabled ? same : row?.querySelector("button:not(:disabled)");
      (target as HTMLElement | null)?.focus() ?? button.focus();
    });
  };
  return (
    <ol class="order">
      <For each={props.order} keyed={(section) => section.id}>
        {(section, index) => (
          <li class="order__item" data-section={section().key}>
            <span class="order__label">{section().label}</span>
            <span class="order__buttons">
              <Button
                variant="quiet"
                class="button--small"
                data-direction="-1"
                disabled={index() === 0}
                aria-label={`Move ${section().label} up`}
                onClick={(event) => void move(section().key, -1, event.currentTarget)}
              >
                Up
              </Button>
              <Button
                variant="quiet"
                class="button--small"
                data-direction="1"
                disabled={index() === props.order.length - 1}
                aria-label={`Move ${section().label} down`}
                onClick={(event) => void move(section().key, 1, event.currentTarget)}
              >
                Down
              </Button>
            </span>
          </li>
        )}
      </For>
    </ol>
  );
}
