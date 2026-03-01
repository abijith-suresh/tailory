import type { Component, JSX } from "solid-js";

interface FormFieldProps {
  label: string;
  id: string;
  children: JSX.Element;
  hint?: string;
}

const FormField: Component<FormFieldProps> = (props) => (
  <div class="space-y-1">
    <label for={props.id} class="block text-sm font-medium text-gray-700">
      {props.label}
    </label>
    {props.children}
    {props.hint && <p class="text-xs text-gray-500">{props.hint}</p>}
  </div>
);

export default FormField;
