import type { JSX } from "@solidjs/web";
import { omit } from "solid-js";

type SwitchProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "type" | "role"> & {
  label: JSX.Element;
  /** The compact one that sits in a field's label row ("Current"). */
  size?: "small";
};

/** An on/off switch: a checkbox with the switch role, its label beside it. */
export function Switch(props: SwitchProps) {
  const rest = omit(props, "label", "size", "class");
  return (
    <label class={["switch", { "switch--small": props.size === "small" }, props.class]}>
      {/* biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox reports its own state */}
      <input {...rest} type="checkbox" role="switch" class="switch__input" />
      <span>{props.label}</span>
    </label>
  );
}
