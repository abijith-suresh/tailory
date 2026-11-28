import { createUniqueId, For } from "solid-js";

export type SegmentedOption<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  /** Names the group for screen readers: "Theme". */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  class?: string;
};

/**
 * A segmented control: two to four options side by side, one chosen. Radio buttons underneath,
 * so arrow keys move the choice and forms read it.
 */
export function Segmented<T extends string>(props: SegmentedProps<T>) {
  const name = props.name ?? createUniqueId();
  return (
    <div role="radiogroup" aria-label={props.label} class={["segmented", props.class]}>
      <For each={props.options}>
        {(option) => (
          <label class="segmented__option">
            <input
              class="segmented__input"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === props.value}
              onChange={() => props.onChange(option.value)}
            />
            {option.label}
          </label>
        )}
      </For>
    </div>
  );
}
