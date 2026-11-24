import type { Component } from "solid-js";

type InputProps = {
  "aria-describedby"?: string;
  autocomplete?: string;
  class?: string;
  error?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  onInput: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  type?: string;
  value: string;
};

/**
 * Shared look for text fields. Phones get 44px and 16px text, which also stops iOS from zooming
 * in on focus. Focus uses the global outline.
 */
export const fieldClass =
  "w-full rounded-md border border-field bg-surface px-3 text-body-md text-fg transition-colors placeholder:text-fg-subtle hover:border-fg-muted read-only:border-line-strong read-only:bg-canvas read-only:text-fg-muted md:text-body-sm aria-invalid:border-danger";

export const inputClass = `${fieldClass} h-11 md:h-9`;

const Input: Component<InputProps> = (props) => (
  <input
    id={props.id}
    name={props.name}
    type={props.type ?? "text"}
    value={props.value}
    autocomplete={props.autocomplete ?? "off"}
    spellcheck={props.type === "email" || props.type === "url" ? false : undefined}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    onBlur={() => props.onBlur?.()}
    placeholder={props.placeholder}
    readOnly={props.readOnly}
    required={props.required}
    aria-invalid={props.error ? "true" : undefined}
    aria-describedby={props["aria-describedby"]}
    class={`${inputClass} ${props.class ?? ""}`}
  />
);

export default Input;
