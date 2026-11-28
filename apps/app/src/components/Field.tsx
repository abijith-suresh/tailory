import type { JSX } from "@solidjs/web";
import { createUniqueId, omit, Show } from "solid-js";

type HeadProps = {
  /** The control's id, which the label points at. */
  for: string;
  label: string;
  /** What's wrong. It takes the label's place in the row; the label stays for screen readers. */
  error?: string;
  errorId: string;
  /** Adds "(optional)" to the label. */
  optional?: boolean;
  /** Something at the right end of the label row, such as a "Current" switch. */
  aside?: JSX.Element;
};

/**
 * The one-line row over a control: its label, or its error in the label's place. Every field
 * has it, so a grid of fields lines up whatever is wrong with them. For custom controls.
 */
export function FieldHead(props: HeadProps) {
  return (
    <div class="field__head">
      <label class={props.error ? "field__label visually-hidden" : "field__label"} for={props.for}>
        {props.label}
        <Show when={props.optional}>
          <span class="field__optional"> (optional)</span>
        </Show>
      </label>
      <Show when={props.error}>
        <span class="field__error" id={props.errorId}>
          {props.error}
        </span>
      </Show>
      <Show when={props.aside}>
        <span class="field__aside">{props.aside}</span>
      </Show>
    </div>
  );
}

type Common = {
  label: string;
  /**
   * Help under the control. Leave it out: fields say what they want in the label. A few older
   * screens still use it until their redesign.
   */
  hint?: string;
  /** What's wrong with the value. Only while it is wrong. */
  error?: string;
  optional?: boolean;
  aside?: JSX.Element;
};

/** Ids and aria wiring shared by every field. */
export function fieldIds(props: { id?: unknown; hint?: string; error?: string }) {
  const id = typeof props.id === "string" ? props.id : createUniqueId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = () =>
    [props.hint && hintId, props.error && errorId].filter(Boolean).join(" ") || undefined;
  return { id, hintId, errorId, describedBy };
}

function Hint(props: { id: string; hint?: string }) {
  return (
    <Show when={props.hint}>
      <p class="field__hint" id={props.id}>
        {props.hint}
      </p>
    </Show>
  );
}

type FieldProps = JSX.InputHTMLAttributes<HTMLInputElement> & Common;

/** A labelled text input. */
export function Field(props: FieldProps) {
  const rest = omit(props, "label", "hint", "error", "optional", "aside", "id", "class");
  const ids = fieldIds(props);
  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <FieldHead
        for={ids.id}
        label={props.label}
        error={props.error}
        errorId={ids.errorId}
        optional={props.optional}
        aside={props.aside}
      />
      <input
        {...rest}
        id={ids.id}
        class="input"
        aria-describedby={ids.describedBy()}
        aria-invalid={props.error ? "true" : undefined}
      />
      <Hint id={ids.hintId} hint={props.hint} />
    </div>
  );
}

type TextAreaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & Common;

/** A labelled multi-line input that grows with its text. */
export function TextArea(props: TextAreaProps) {
  const rest = omit(props, "label", "hint", "error", "optional", "aside", "id", "class");
  const ids = fieldIds(props);
  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <FieldHead
        for={ids.id}
        label={props.label}
        error={props.error}
        errorId={ids.errorId}
        optional={props.optional}
        aside={props.aside}
      />
      <textarea
        {...rest}
        id={ids.id}
        class="input textarea"
        aria-describedby={ids.describedBy()}
        aria-invalid={props.error ? "true" : undefined}
      />
      <Hint id={ids.hintId} hint={props.hint} />
    </div>
  );
}
