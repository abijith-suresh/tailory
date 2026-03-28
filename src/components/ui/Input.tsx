import type { Component } from "solid-js";

type InputProps = {
  "aria-describedby"?: string;
  class?: string;
  error?: boolean;
  id?: string;
  onBlur?: () => void;
  onInput: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
};

const inputBase =
  "w-full rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1";

const inputNormal =
  "border-gray-300 transition-colors duration-150 hover:border-gray-400 focus:border-[#1d6648] focus:ring-[#1d6648]/30";
const inputError = "border-red-400 focus:border-red-500 focus:ring-red-500/20";

const Input: Component<InputProps> = (props) => (
  <input
    id={props.id}
    type={props.type ?? "text"}
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
    onBlur={props.onBlur}
    placeholder={props.placeholder}
    aria-invalid={props.error ? "true" : undefined}
    aria-describedby={props["aria-describedby"]}
    class={`${inputBase} ${props.error ? inputError : inputNormal} ${props.class ?? ""}`}
  />
);

export default Input;

// Kept for backward-compatibility with consumers that import inputClass directly
export const inputClass = `${inputBase} ${inputNormal}`;
