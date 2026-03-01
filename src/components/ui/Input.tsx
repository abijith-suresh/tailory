import type { Component } from "solid-js";

type InputProps = {
  id?: string;
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: string;
  class?: string;
};

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const Input: Component<InputProps> = (props) => (
  <input
    id={props.id}
    type={props.type ?? "text"}
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    placeholder={props.placeholder}
    class={`${inputClass} ${props.class ?? ""}`}
  />
);

export default Input;
export { inputClass };
