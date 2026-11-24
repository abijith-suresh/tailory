import { createUniqueId, type JSX, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";

import { focusableIn, inertOutside, trapTab } from "./focus";

interface DialogProps {
  open: boolean;
  title: string;
  /** Called on Escape, a click outside the panel, or a close button. */
  onClose: () => void;
  description?: JSX.Element;
  children?: JSX.Element;
  /** An element in the dialog to focus first. Defaults to the first field or button. */
  initialFocus?: () => HTMLElement | undefined;
}

function DialogPanel(props: DialogProps) {
  const titleId = createUniqueId();
  const descriptionId = createUniqueId();
  let panel!: HTMLDivElement;
  let overlay!: HTMLDivElement;
  const returnTo = document.activeElement as HTMLElement | null;
  let restoreOutside = () => {};

  onMount(() => {
    // Portal puts the overlay in its own container under <body>; keep that one reachable.
    restoreOutside = inertOutside(overlay.parentElement ?? overlay);
    const first = props.initialFocus?.() ?? focusableIn(panel)[0] ?? panel;
    first.focus();
  });

  onCleanup(() => {
    restoreOutside();
    if (returnTo?.isConnected) returnTo.focus();
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      props.onClose();
      return;
    }
    trapTab(event, panel);
  };

  return (
    <div
      ref={overlay}
      class="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === overlay) props.onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={props.description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        class="menu-enter max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl bg-surface p-6 text-fg ring-1 ring-line sm:max-w-md sm:rounded-2xl"
      >
        <h2 id={titleId} class="pr-8 text-heading-6 text-balance">
          {props.title}
        </h2>
        <Show when={props.description}>
          <div id={descriptionId} class="mt-2 text-body-sm text-pretty text-fg-muted">
            {props.description}
          </div>
        </Show>
        {props.children}
      </div>
    </div>
  );
}

/**
 * A modal dialog. While open, the rest of the page is inert, Tab stays inside, and Escape closes
 * it. Focus goes back to whatever had it before.
 */
export default function Dialog(props: DialogProps) {
  return (
    <Show when={props.open}>
      <Portal>
        <DialogPanel {...props} />
      </Portal>
    </Show>
  );
}

/** The row of buttons at the bottom of a dialog. The main action goes last. */
export function DialogActions(props: { children: JSX.Element }) {
  return (
    <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{props.children}</div>
  );
}
