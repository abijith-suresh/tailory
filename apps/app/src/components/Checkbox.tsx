import type { JSX } from "@solidjs/web";
import { createUniqueId, omit, Show } from "solid-js";

type CheckboxProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** The label. Text or markup; it is the whole click target. */
  label: JSX.Element;
  hint?: string;
};

/** A checkbox with its label beside it. */
export function Checkbox(props: CheckboxProps) {
  const rest = omit(props, "label", "hint", "id", "class");
  const id = props.id ?? createUniqueId();
  return (
    <div class={props.class ? `checkbox ${props.class}` : "checkbox"}>
      <input
        {...rest}
        id={id}
        type="checkbox"
        class="checkbox__input"
        aria-describedby={props.hint ? `${id}-hint` : undefined}
      />
      <label class="checkbox__label" for={id}>
        {props.label}
      </label>
      <Show when={props.hint}>
        <p class="checkbox__hint field__hint" id={`${id}-hint`}>
          {props.hint}
        </p>
      </Show>
    </div>
  );
}
