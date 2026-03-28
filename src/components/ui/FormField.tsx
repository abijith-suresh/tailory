import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

interface FormFieldProps {
  children: JSX.Element;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  required?: boolean;
}

const FormField: Component<FormFieldProps> = (props) => (
  <div class="space-y-1">
    <label for={props.id} class="block text-sm font-medium text-gray-700">
      {props.label}
      <Show when={props.required}>
        <span aria-hidden="true" class="ml-0.5 text-red-500">
          *
        </span>
      </Show>
    </label>
    {props.children}
    <Show
      when={props.error}
      fallback={
        <Show when={props.hint}>
          <p class="text-xs text-gray-500">{props.hint}</p>
        </Show>
      }
    >
      <p id={`${props.id}-error`} role="alert" class="text-xs text-red-600">
        {props.error}
      </p>
    </Show>
  </div>
);

export default FormField;
