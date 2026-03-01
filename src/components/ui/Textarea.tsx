import type { Component } from "solid-js";

type TextareaProps = {
  id?: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

const Textarea: Component<TextareaProps> = (props) => (
  <textarea
    id={props.id}
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    placeholder={props.placeholder}
    rows={props.rows ?? 4}
    class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
  />
);

export default Textarea;
