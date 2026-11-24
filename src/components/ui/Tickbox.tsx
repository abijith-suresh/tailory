import type { JSX } from "solid-js";

interface TickboxProps {
  checked: boolean;
  onChange: () => void;
  /** The checkbox's accessible name when the visible text isn't enough. */
  ariaLabel?: string;
  /** Visible text beside the box. Clicking it toggles the box. */
  children?: JSX.Element;
  class?: string;
}

/**
 * Whether a version keeps an entry or bullet. A real checkbox, so Space toggles it, inside a label
 * padded to a 44px target on phones and 36px from md.
 */
export default function Tickbox(props: TickboxProps) {
  return (
    <label
      class={`flex min-h-11 min-w-11 cursor-pointer items-start gap-3 py-3 md:min-h-9 md:min-w-9 md:py-2.5 ${props.class ?? ""}`}
    >
      <input
        type="checkbox"
        class="tickbox-input mt-0.5"
        checked={props.checked}
        onChange={() => props.onChange()}
        aria-label={props.ariaLabel}
      />
      {props.children}
    </label>
  );
}
