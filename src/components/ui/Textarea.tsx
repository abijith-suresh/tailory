import type { Component } from "solid-js";

import { fieldClass } from "./Input";

type TextareaProps = {
  "aria-describedby"?: string;
  class?: string;
  error?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  onInput: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
  value: string;
};

const Textarea: Component<TextareaProps> = (props) => (
  <textarea
    id={props.id}
    name={props.name}
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    onBlur={() => props.onBlur?.()}
    placeholder={props.placeholder}
    readOnly={props.readOnly}
    rows={props.rows ?? 4}
    aria-invalid={props.error ? "true" : undefined}
    aria-describedby={props["aria-describedby"]}
    class={`${fieldClass} field-sizing-content min-h-11 resize-y supports-[field-sizing:content]:resize-none py-2 ${props.class ?? ""}`}
  />
);

export default Textarea;
