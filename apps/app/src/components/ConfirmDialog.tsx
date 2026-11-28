import type { JSX } from "@solidjs/web";
import { createSignal } from "solid-js";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field } from "./Field";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  /** The word to type before the button works: "erase". */
  word: string;
  /** The button's label: "Erase everything". */
  action: string;
  /** Does the thing. Resolves once it's done, or throws with what went wrong. */
  onConfirm: () => Promise<void>;
};

/**
 * A confirmation for what can't be undone, such as erasing data or deleting an account: the
 * person types a word before the danger button works. Everything else in the app offers Undo.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const [typed, setTyped] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const matches = () => typed().trim().toLowerCase() === props.word;

  const close = () => {
    if (busy()) return;
    setTyped("");
    setError("");
    props.onClose();
  };

  return (
    <Dialog
      open={props.open}
      onClose={close}
      title={props.title}
      size="small"
      class="confirm-dialog"
      onSubmit={async () => {
        if (!matches() || busy()) return;
        setBusy(true);
        setError("");
        try {
          await props.onConfirm();
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure));
          setBusy(false);
        }
      }}
      footer={
        <>
          <Button onClick={close} disabled={busy()}>
            Cancel
          </Button>
          <Button type="submit" variant="danger-solid" disabled={!matches()} busy={busy()}>
            {props.action}
          </Button>
        </>
      }
    >
      <div class="confirm-dialog__text">{props.children}</div>
      <Field
        label={`Type ${props.word} to confirm`}
        value={typed()}
        autocomplete="off"
        spellcheck={false}
        autocapitalize="off"
        onInput={(event) => setTyped(event.currentTarget.value)}
      />
      <p class="form-error" role="alert">
        {error()}
      </p>
    </Dialog>
  );
}
