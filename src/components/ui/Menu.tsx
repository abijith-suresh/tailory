import {
  createEffect,
  createSignal,
  createUniqueId,
  For,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";

export interface MenuItem {
  label: string;
  /** A second, quieter line under the label. */
  detail?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  /** The trigger's content. */
  label: JSX.Element;
  /** The trigger's accessible name, when its content is only an icon or needs more context. */
  ariaLabel?: string;
  triggerClass: string;
  items: MenuItem[];
  /** Which edge of the trigger the menu lines up with. */
  align?: "start" | "end";
  /** Extra props for the trigger, such as `data-testid`. */
  triggerProps?: JSX.ButtonHTMLAttributes<HTMLButtonElement>;
}

const VIEWPORT_GUTTER = 16;

/**
 * A button that opens a list of actions. Arrow keys, Home and End move between items; Escape and
 * Tab close it and return focus to the button.
 */
export default function Menu(props: MenuProps) {
  const menuId = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ top: 0, left: 0, right: 0 });
  let trigger!: HTMLButtonElement;
  let menu: HTMLDivElement | undefined;

  const items = () =>
    menu ? [...menu.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])")] : [];

  const focusItem = (index: number) => {
    const list = items();
    if (list.length === 0) return;
    list[(index + list.length) % list.length]?.focus();
  };

  const show = (focus: "first" | "last" = "first") => {
    const rect = trigger.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(VIEWPORT_GUTTER, rect.left),
      right: Math.max(VIEWPORT_GUTTER, window.innerWidth - rect.right),
    });
    setOpen(true);
    queueMicrotask(() => focusItem(focus === "first" ? 0 : -1));
  };

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.focus();
  };

  const select = (item: MenuItem) => {
    close();
    item.onSelect();
  };

  createEffect(() => {
    if (!open()) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu?.contains(target) && !trigger.contains(target)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    });
  });

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case "Tab":
        event.preventDefault();
        close();
        break;
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(event.key === "ArrowDown" ? "first" : "last");
    }
  };

  return (
    <>
      <button
        {...props.triggerProps}
        ref={trigger}
        type="button"
        class={props.triggerClass}
        aria-label={props.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-controls={open() ? menuId : undefined}
        onClick={() => (open() ? close() : show())}
        onKeyDown={onTriggerKeyDown}
      >
        {props.label}
      </button>
      <Show when={open()}>
        <Portal>
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label={props.ariaLabel}
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            class="menu-enter fixed z-40 min-w-56 overflow-hidden rounded-xl bg-surface p-1 text-fg ring-1 ring-line-strong"
            style={{
              top: `${position().top}px`,
              "max-width": `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`,
              ...(props.align === "start"
                ? { left: `${position().left}px` }
                : { right: `${position().right}px` }),
            }}
          >
            <For each={props.items}>
              {(item) => (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.disabled}
                  onClick={() => select(item)}
                  class="flex min-h-11 w-full flex-col items-start justify-center rounded-lg px-3 py-2 text-left outline-offset-[-2px] hover:bg-selected focus-visible:bg-selected disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"
                >
                  <span class="text-ui-sm">{item.label}</span>
                  <Show when={item.detail}>
                    <span class="text-body-xs text-fg-subtle">{item.detail}</span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  );
}
