import type { JSX } from "@solidjs/web";
import { createUniqueId, omit, Show } from "solid-js";

type FieldProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Help under the input. */
  hint?: string;
  /** What's wrong with the value. Marks the input invalid and is read out with it. */
  error?: string;
  /** Adds "(optional)" to the label. */
  optional?: boolean;
};

/** A labelled text input with optional help and error text. */
export function Field(props: FieldProps) {
  const rest = omit(props, "label", "hint", "error", "optional", "id", "class");
  const id = props.id ?? createUniqueId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = () =>
    [props.hint && hintId, props.error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <label class="field__label" for={id}>
        {props.label}
        <Show when={props.optional}>
          <span class="field__optional"> (optional)</span>
        </Show>
      </label>
      <input
        {...rest}
        id={id}
        class="input"
        aria-describedby={describedBy()}
        aria-invalid={props.error ? "true" : undefined}
      />
      <Show when={props.hint}>
        <p class="field__hint" id={hintId}>
          {props.hint}
        </p>
      </Show>
      <Show when={props.error}>
        <p class="field__error" id={errorId}>
          {props.error}
        </p>
      </Show>
    </div>
  );
}

type TextAreaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  optional?: boolean;
};

/** A labelled multi-line input that grows with its text, where the browser supports it. */
export function TextArea(props: TextAreaProps) {
  const rest = omit(props, "label", "hint", "optional", "id", "class");
  const id = props.id ?? createUniqueId();
  const hintId = `${id}-hint`;

  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <label class="field__label" for={id}>
        {props.label}
        <Show when={props.optional}>
          <span class="field__optional"> (optional)</span>
        </Show>
      </label>
      <textarea
        {...rest}
        id={id}
        class="input textarea"
        aria-describedby={props.hint ? hintId : undefined}
      />
      <Show when={props.hint}>
        <p class="field__hint" id={hintId}>
          {props.hint}
        </p>
      </Show>
    </div>
  );
}
