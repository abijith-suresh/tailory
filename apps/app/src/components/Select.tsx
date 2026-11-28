import type { JSX } from "@solidjs/web";
import { For, omit, Show } from "solid-js";

import { FieldHead, fieldIds } from "./Field";
import { Icon } from "./Icon";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string;
  optional?: boolean;
};

/**
 * A labelled `<select>`. Browsers with the customizable select (`appearance: base-select`) show
 * the app's own button and picker; the rest show a native select with our arrow. Either way it is
 * a real select, so forms, keyboard use and screen readers work as usual.
 */
export function Select(props: SelectProps) {
  const rest = omit(props, "label", "options", "hint", "error", "optional", "id", "class", "value");
  const ids = fieldIds(props);
  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <FieldHead
        for={ids.id}
        label={props.label}
        error={props.error}
        errorId={ids.errorId}
        optional={props.optional}
      />
      <div class="select-wrap">
        <select
          {...rest}
          id={ids.id}
          class="select"
          aria-describedby={ids.describedBy()}
          aria-invalid={props.error ? "true" : undefined}
        >
          <button type="button" tabindex="-1">
            <selectedcontent />
            <Icon name="chevron-down" class="select__arrow" />
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
        <Icon name="chevron-down" class="select-wrap__arrow" />
      </div>
      <Show when={props.hint}>
        <p class="field__hint" id={ids.hintId}>
          {props.hint}
        </p>
      </Show>
    </div>
  );
}
