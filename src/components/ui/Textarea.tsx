import type { Component } from "solid-js";

type TextareaProps = {
  "aria-describedby"?: string;
  error?: boolean;
  id?: string;
  onBlur?: () => void;
  onInput: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
};

const textareaBase =
  "w-full rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1";

const textareaNormal =
  "border-gray-300 transition-colors duration-150 hover:border-gray-400 focus:border-[#1d6648] focus:ring-[#1d6648]/30 resize-y";
const textareaError = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

const Textarea: Component<TextareaProps> = (props) => (
  <textarea
    id={props.id}
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    onBlur={props.onBlur}
    placeholder={props.placeholder}
    rows={props.rows ?? 4}
    aria-invalid={props.error ? "true" : undefined}
    aria-describedby={props["aria-describedby"]}
    class={`${textareaBase} ${props.error ? textareaError : textareaNormal}`}
  />
);

export default Textarea;
