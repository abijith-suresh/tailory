import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

interface FormFieldProps {
  children: JSX.Element;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  required?: boolean;
  /** Shown at the end of the label row, such as a "Reworded" mark. */
  aside?: JSX.Element;
  /** Keeps the label for screen readers only. */
  hideLabel?: boolean;
}

/** A label, its field, and a hint or error under it. Give the field `aria-describedby={hintId}`. */
const FormField: Component<FormFieldProps> = (props) => (
  <div class="min-w-0">
    <div
      class={`flex items-baseline justify-between gap-2 ${props.hideLabel ? "" : "mb-1 min-h-5"}`}
    >
      <label for={props.id} class={props.hideLabel ? "sr-only" : "text-ui-sm text-fg"}>
        {props.label}
        <Show when={props.required}>
          <span aria-hidden="true" class="text-fg-subtle">
            {" "}
            (required)
          </span>
        </Show>
      </label>
      <Show when={!props.hideLabel}>{props.aside}</Show>
    </div>
    {props.children}
    <Show when={props.hideLabel}>
      <div class="mt-1 empty:hidden">{props.aside}</div>
    </Show>
    <Show
      when={props.error}
      fallback={
        <Show when={props.hint}>
          <p id={`${props.id}-hint`} class="mt-1 text-body-xs text-fg-subtle">
            {props.hint}
          </p>
        </Show>
      }
    >
      <p id={`${props.id}-error`} role="alert" class="mt-1 text-body-xs text-danger">
        {props.error}
      </p>
    </Show>
  </div>
);

export default FormField;
