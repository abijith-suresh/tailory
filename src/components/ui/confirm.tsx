import { createSignal } from "solid-js";

import { dangerButton, outlineButton, primaryButton } from "./buttons";
import Dialog, { DialogActions } from "./Dialog";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

const [pending, setPending] = createSignal<PendingConfirm | null>(null);

/** Asks a yes-or-no question in a dialog. Resolves false when the user cancels or closes it. */
export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  pending()?.resolve(false);
  return new Promise((resolve) => setPending({ ...options, resolve }));
}

/** Renders the dialog for `requestConfirm`. Mount it once in the editor. */
export function ConfirmHost() {
  let cancelButton: HTMLButtonElement | undefined;

  const answer = (confirmed: boolean) => {
    const request = pending();
    setPending(null);
    request?.resolve(confirmed);
  };

  return (
    <Dialog
      open={pending() !== null}
      title={pending()?.title ?? ""}
      description={pending()?.body}
      onClose={() => answer(false)}
      initialFocus={() => cancelButton}
    >
      <DialogActions>
        <button
          type="button"
          ref={(element) => (cancelButton = element)}
          class={outlineButton}
          onClick={() => answer(false)}
        >
          {pending()?.cancelLabel ?? "Cancel"}
        </button>
        <button
          type="button"
          class={pending()?.danger ? dangerButton : primaryButton}
          onClick={() => answer(true)}
        >
          {pending()?.confirmLabel}
        </button>
      </DialogActions>
    </Dialog>
  );
}
