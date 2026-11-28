import type { JSX } from "@solidjs/web";
import { createEffect, createUniqueId, onCleanup, Show } from "solid-js";

import { Button } from "./Button";
import { Icon } from "./Icon";

type DialogProps = {
  open: boolean;
  /** Called however it closes: Escape, the close button, a click outside (with `dismissable`). */
  onClose: () => void;
  title: string;
  children?: JSX.Element;
  /** Buttons along the bottom edge, primary last. */
  footer?: JSX.Element;
  /** Makes the body and footer one form, so Enter submits. */
  onSubmit?: (event: SubmitEvent & { currentTarget: HTMLFormElement }) => void;
  size?: "small";
  /** Close on a click outside. Leave off for dialogs that hold typing. */
  dismissable?: boolean;
  class?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[hidden], [inert]")
  );

/**
 * A modal dialog on the native `<dialog>`: the rest of the page is inert while it's open, Tab
 * cycles inside it, Escape closes it, and focus goes back to whatever opened it. On phones it is
 * a sheet from the bottom edge. It enters and leaves with CSS (see "Motion" in the README).
 *
 * Focus starts on the element with `autofocus`, else the first field, else the close button.
 */
export function Dialog(props: DialogProps) {
  const titleId = createUniqueId();
  let dialog: HTMLDialogElement | undefined;
  let returnTo: HTMLElement | null = null;

  const restoreFocus = () => {
    const target = returnTo;
    returnTo = null;
    if (target?.isConnected) target.focus();
  };

  const show = () => {
    if (!dialog || dialog.open) return;
    returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const body = dialog.querySelector<HTMLElement>(".dialog__body");
    const first =
      dialog.querySelector<HTMLElement>("[autofocus]") ??
      (body ? focusables(body)[0] : undefined) ??
      dialog.querySelector<HTMLElement>(".dialog__close");
    first?.focus();
  };

  createEffect(
    () => props.open,
    (open) => {
      if (open) show();
      else if (dialog?.open) dialog.close();
    }
  );

  onCleanup(() => {
    if (dialog?.open) dialog.close();
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !dialog) return;
    const items = focusables(dialog);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onClick = (event: MouseEvent) => {
    // A click on the backdrop lands on the dialog element itself, outside its box.
    if (!props.dismissable || !dialog || event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) dialog.close();
  };

  const content = () => (
    <>
      <div class="dialog__body">{props.children}</div>
      <Show when={props.footer}>
        <div class="dialog__foot">{props.footer}</div>
      </Show>
    </>
  );

  return (
    <dialog
      ref={(element) => {
        dialog = element;
      }}
      class={["dialog", { "dialog--small": props.size === "small" }, props.class]}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onClose={() => {
        restoreFocus();
        if (props.open) props.onClose();
      }}
    >
      <div class="dialog__head">
        <h2 class="dialog__title" id={titleId}>
          {props.title}
        </h2>
        <Button
          variant="quiet"
          icon
          size="small"
          class="dialog__close"
          aria-label="Close"
          onClick={() => dialog?.close()}
        >
          <Icon name="close" />
        </Button>
      </div>
      <Show when={props.onSubmit} fallback={content()}>
        {(onSubmit) => (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit()(event);
            }}
          >
            {content()}
          </form>
        )}
      </Show>
    </dialog>
  );
}
