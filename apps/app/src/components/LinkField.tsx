import type { JSX } from "@solidjs/web";
import { createMemo, createSignal, omit, Show } from "solid-js";

import { siteFromUrl } from "../lib/link-site";
import { FieldHead, fieldIds } from "./Field";
import { Icon } from "./Icon";

type LinkFieldProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onInput"> & {
  label: string;
  value: string;
  onInput: (value: string) => void;
  error?: string;
  optional?: boolean;
};

/**
 * An address field that names the site as you type: "github.com/ada" shows GitHub, an address we
 * don't know shows Website. The name is read out with the field.
 */
export function LinkField(props: LinkFieldProps) {
  const rest = omit(props, "label", "value", "onInput", "error", "optional", "id", "class");
  const ids = fieldIds(props);
  const siteId = `${ids.id}-site`;
  const [text, setText] = createSignal(props.value);
  const site = createMemo(() => siteFromUrl(text()));
  let input: HTMLInputElement | undefined;

  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <FieldHead
        for={ids.id}
        label={props.label}
        error={props.error}
        errorId={ids.errorId}
        optional={props.optional}
      />
      <div
        class="link-input"
        data-invalid={props.error ? "" : undefined}
        // The site name is part of the field's box: pressing it puts the caret in the input.
        onPointerDown={(event) => {
          if (event.target === input) return;
          event.preventDefault();
          input?.focus();
        }}
      >
        <Show when={site()}>
          {(found) => (
            <span class="link-input__site" id={siteId} data-known={found().known ? "" : undefined}>
              <Icon name={found().known ? "link" : "globe"} />
              {found().label}
            </span>
          )}
        </Show>
        <input
          {...rest}
          ref={(element) => {
            input = element;
          }}
          id={ids.id}
          class="link-input__input"
          type="url"
          inputmode="url"
          autocomplete="url"
          spellcheck={false}
          value={props.value}
          aria-describedby={
            [site() && siteId, props.error && ids.errorId].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={props.error ? "true" : undefined}
          onInput={(event) => {
            setText(event.currentTarget.value);
            props.onInput(event.currentTarget.value);
          }}
        />
      </div>
    </div>
  );
}
