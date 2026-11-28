import type { JSX } from "@solidjs/web";
import { createSignal, createUniqueId, For, Match, onCleanup, Show, Switch } from "solid-js";

import { Icon } from "./Icon";

export type MenuEntry =
  | { kind?: "item"; label: string; onSelect: () => void; icon?: JSX.Element; danger?: boolean }
  | { kind: "checkbox"; label: string; checked: boolean; onChange: (checked: boolean) => void }
  | { kind: "separator" }
  | { kind: "label"; label: string };

type MenuProps = {
  items: readonly MenuEntry[];
  /** What the trigger shows: text, an icon, or both. */
  trigger: JSX.Element;
  /** The trigger's accessible name when it shows only an icon. */
  triggerLabel?: string;
  /** Classes for the trigger button; it has none of its own beyond `menu-trigger`. */
  triggerClass?: string;
  /** Puts a dot on the trigger: "something in here is on", such as Show archived. */
  active?: boolean;
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end";
  /** Content above the items, such as who is signed in. */
  header?: JSX.Element;
  class?: string;
};

const GAP = 6;
const EDGE = 8;

/**
 * A menu button: the trigger opens a list of actions or checkable items in a popover.
 *
 * Keyboard, as in the ARIA menu button pattern: Enter, Space or Down on the trigger open it on the
 * first item, Up on the last. In the menu, Up and Down move (and wrap), Home and End jump, a letter
 * jumps to the next item starting with it, Enter or Space chooses, Escape closes and goes back to
 * the trigger, and Tab closes and moves on.
 */
export function Menu(props: MenuProps) {
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  let menu: HTMLDivElement | undefined;

  const items = () => (menu ? [...menu.querySelectorAll<HTMLElement>("[data-menu-item]")] : []);

  const place = () => {
    if (!trigger || !menu) return;
    const anchor = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    let left = props.align === "end" ? anchor.right - width : anchor.left;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE));
    let top = anchor.bottom + GAP;
    const above = top + height > window.innerHeight - EDGE && anchor.top - GAP - height > EDGE;
    if (above) top = anchor.top - GAP - height;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    const x = props.align === "end" ? "right" : "left";
    menu.style.setProperty("--menu-origin", `${above ? "bottom" : "top"} ${x}`);
    // Opening upward, it rises toward the trigger instead of dropping.
    menu.style.setProperty("--menu-shift", above ? "calc(var(--motion-drop) * -1)" : "");
  };

  const focusItem = (index: number) => {
    const list = items();
    if (list.length === 0) return;
    list[(index + list.length) % list.length].focus();
  };

  const show = (focus: "first" | "last") => {
    if (!menu || open()) return;
    menu.showPopover();
    setOpen(true);
    place();
    focusItem(focus === "first" ? 0 : -1);
  };

  const hide = (returnFocus: boolean) => {
    if (!menu || !open()) return;
    setOpen(false);
    menu.hidePopover();
    if (returnFocus) trigger?.focus();
  };

  const onResize = () => {
    if (open()) place();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  }
  onCleanup(() => {
    if (open()) menu?.hidePopover();
  });

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    // Enter and Space reach onClick as a native button press.
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open()) focusItem(0);
      else show("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open()) focusItem(-1);
      else show("last");
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(at + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusItem(at - 1);
        return;
      case "Home":
        event.preventDefault();
        focusItem(0);
        return;
      case "End":
        event.preventDefault();
        focusItem(-1);
        return;
      case "Escape":
        event.preventDefault();
        hide(true);
        return;
      case "Tab":
        // Back on the trigger, the Tab carries on from there.
        hide(true);
        return;
    }
    if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey) {
      const letter = event.key.toLowerCase();
      for (let step = 1; step <= list.length; step++) {
        const candidate = list[(at + step) % list.length];
        if (candidate.textContent?.trim().toLowerCase().startsWith(letter)) {
          candidate.focus();
          break;
        }
      }
    }
  };

  const choose = (run: () => void) => {
    hide(true);
    run();
  };

  return (
    <>
      <button
        ref={(element) => {
          trigger = element;
        }}
        type="button"
        class={["menu-trigger", props.triggerClass]}
        aria-haspopup="menu"
        aria-expanded={open() ? "true" : "false"}
        aria-controls={id}
        aria-label={props.triggerLabel}
        data-active={props.active ? "" : undefined}
        onClick={() => (open() ? hide(false) : show("first"))}
        onKeyDown={onTriggerKeyDown}
      >
        {props.trigger}
      </button>
      <div
        ref={(element) => {
          menu = element;
        }}
        id={id}
        class={["menu", props.class]}
        popover="auto"
        role="menu"
        aria-label={props.triggerLabel}
        onKeyDown={onMenuKeyDown}
        // Light dismiss (a click outside, or Escape handled by the browser) closes it too.
        onToggle={(event: ToggleEvent) => {
          if (event.newState === "closed") setOpen(false);
        }}
      >
        <Show when={props.header}>{props.header}</Show>
        <For each={props.items}>
          {(entry) => (
            <Switch>
              <Match when={entry.kind === "separator"}>
                <hr class="menu__separator" />
              </Match>
              <Match when={entry.kind === "label" && entry}>
                {(label) => (
                  <div class="menu__label" role="presentation">
                    {label().label}
                  </div>
                )}
              </Match>
              <Match when={entry.kind === "checkbox" && entry}>
                {(item) => (
                  <button
                    type="button"
                    class="menu__item"
                    role="menuitemcheckbox"
                    tabindex="-1"
                    data-menu-item
                    aria-checked={item().checked ? "true" : "false"}
                    onClick={() => choose(() => item().onChange(!item().checked))}
                  >
                    {item().label}
                    <Icon name="check" class="menu__check" />
                  </button>
                )}
              </Match>
              <Match when={(entry.kind === undefined || entry.kind === "item") && entry}>
                {(item) => (
                  <button
                    type="button"
                    class={["menu__item", { "menu__item--danger": Boolean(item().danger) }]}
                    role="menuitem"
                    tabindex="-1"
                    data-menu-item
                    onClick={() => choose(item().onSelect)}
                  >
                    {item().icon}
                    {item().label}
                  </button>
                )}
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </>
  );
}
