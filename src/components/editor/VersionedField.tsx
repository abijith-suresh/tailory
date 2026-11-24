import { type Component, createMemo, Show } from "solid-js";

import { inlineAction } from "@/components/ui/buttons";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { findRewording, sameText } from "@/lib/versions/resolve";
import { clearRewording, setRewording } from "@/store/document";
import { activeVersion } from "@/store/editor";

export interface VersionedFieldProps {
  id: string;
  label: string;
  /** The master's text. */
  value: string;
  /** Writes the master's text. */
  onInput: (value: string) => void;
  /**
   * The item and field a version may reword. Without it the field is the same in every version,
   * and is read-only while one is open.
   */
  reword?: { itemId: string; field: string };
  multiline?: boolean;
  rows?: number;
  type?: string;
  name?: string;
  autocomplete?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  onBlur?: () => void;
  /** Hides the label visually; it still names the field. */
  hideLabel?: boolean;
  class?: string;
}

const SHARED_HINT = "Same in every version. Change it on Master.";

/**
 * A text field that edits the master, or, while a version is open, that version's wording.
 *
 * In a version, typing into a field that is empty on the master fills in the master instead, so a
 * new entry or bullet added there gets real text rather than a rewording of nothing. That choice
 * is made on the first keystroke and holds until the field loses focus.
 */
export const VersionedField: Component<VersionedFieldProps> = (props) => {
  const rewording = createMemo(() => {
    const version = activeVersion();
    return version && props.reword
      ? findRewording(version, props.reword.itemId, props.reword.field)
      : undefined;
  });
  const shared = () => activeVersion() !== undefined && !props.reword;
  const originalChanged = () => {
    const current = rewording();
    return current !== undefined && !sameText(props.value, current.baseText);
  };
  const shown = () => rewording()?.text ?? props.value;

  let target: { versionId: string; writes: "master" | "version" } | null = null;

  const write = (text: string) => {
    const version = activeVersion();
    if (!version || !props.reword) {
      props.onInput(text);
      return;
    }
    if (target?.versionId !== version.id) {
      const blank = props.value.trim() === "" && rewording() === undefined;
      target = { versionId: version.id, writes: blank ? "master" : "version" };
    }
    if (target.writes === "master") props.onInput(text);
    else setRewording(version.id, props.reword.itemId, props.reword.field, text);
  };

  const useOriginal = () => {
    const version = activeVersion();
    if (version && props.reword)
      clearRewording(version.id, props.reword.itemId, props.reword.field);
  };

  // Keeping the rewording against the new master text clears the note.
  const keepMine = () => {
    const version = activeVersion();
    const current = rewording();
    if (version && props.reword && current) {
      setRewording(version.id, props.reword.itemId, props.reword.field, current.text);
    }
  };

  const statusId = () => `${props.id}-status`;
  const hint = () => (shared() ? SHARED_HINT : props.hint);
  const describedBy = () =>
    [
      props.error ? `${props.id}-error` : hint() ? `${props.id}-hint` : "",
      rewording() ? statusId() : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const onBlur = () => {
    target = null;
    props.onBlur?.();
  };
  // A bar down the left edge marks reworded text; blue outlines are for focus.
  const fieldClass = () => (rewording() ? "shadow-[inset_3px_0_0_var(--color-keep)]" : "");

  return (
    <div class={props.class}>
      <FormField
        id={props.id}
        label={props.label}
        hideLabel={props.hideLabel}
        required={props.required}
        hint={hint()}
        error={props.error}
        aside={
          <Show when={rewording()}>
            <span class="flex shrink-0 items-baseline gap-2">
              <span class="text-ui-xs text-fg-muted">Reworded</span>
              <Show when={!originalChanged()}>
                <button type="button" class={inlineAction} onClick={useOriginal}>
                  Use original
                </button>
              </Show>
            </span>
          </Show>
        }
      >
        <Show
          when={props.multiline}
          fallback={
            <Input
              id={props.id}
              name={props.name ?? props.id}
              type={props.type}
              autocomplete={props.autocomplete}
              required={props.required}
              value={shown()}
              onInput={write}
              onBlur={onBlur}
              placeholder={props.placeholder}
              readOnly={shared()}
              error={!!props.error}
              aria-describedby={describedBy()}
              class={fieldClass()}
            />
          }
        >
          <Textarea
            id={props.id}
            name={props.name ?? props.id}
            rows={props.rows}
            value={shown()}
            onInput={write}
            onBlur={onBlur}
            placeholder={props.placeholder}
            readOnly={shared()}
            error={!!props.error}
            aria-describedby={describedBy()}
            class={fieldClass()}
          />
        </Show>
      </FormField>
      <Show when={rewording()}>
        <div id={statusId()} class="mt-1 text-body-xs text-fg-muted">
          <Show
            when={originalChanged()}
            fallback={<span class="sr-only">Reworded for this version.</span>}
          >
            <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>
                Original changed:{" "}
                <span class="text-fg">{props.value.trim() ? `“${props.value}”` : "now empty"}</span>
              </span>
              <span class="flex gap-3">
                <button type="button" class={inlineAction} onClick={useOriginal}>
                  Use new original
                </button>
                <button type="button" class={inlineAction} onClick={keepMine}>
                  Keep mine
                </button>
              </span>
            </p>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default VersionedField;
