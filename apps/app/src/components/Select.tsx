import type { JSX } from "@solidjs/web";
import { createUniqueId, For, omit, Show } from "solid-js";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string;
};

/**
 * A labelled `<select>`. Browsers with the customizable select (`appearance: base-select`) show
 * the app's own button and picker; the rest show a native select styled to match. Either way it is
 * a real select, so forms, keyboard use and screen readers work as usual.
 */
export function Select(props: SelectProps) {
  const rest = omit(props, "label", "options", "hint", "error", "id", "class", "value");
  const id = props.id ?? createUniqueId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = () =>
    [props.hint && hintId, props.error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <label class="field__label" for={id}>
        {props.label}
      </label>
      <select
        {...rest}
        id={id}
        class="select"
        aria-describedby={describedBy()}
        aria-invalid={props.error ? "true" : undefined}
      >
        <button type="button" tabindex="-1">
          <selectedcontent />
          <svg class="select__arrow" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <For each={props.options}>
          {(option) => (
            <option
              value={option.value}
              disabled={option.disabled}
              selected={option.value === props.value}
            >
              {option.label}
            </option>
          )}
        </For>
      </select>
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
