import { type Component, For, Show } from "solid-js";

import VersionedField from "@/components/editor/VersionedField";
import { toggleExcluded } from "@/store/document";
import { activeVersion } from "@/store/editor";
import type { ResumeHighlight } from "@/types/resume";
import { iconButton } from "./buttons";
import { Close, Plus } from "./icons";
import Tickbox from "./Tickbox";

interface HighlightListProps {
  highlights: ResumeHighlight[];
  idPrefix: string;
  label: string;
  addLabel: string;
  placeholder: string;
  onInput: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/**
 * The bullets under an entry. On the master they can be added, edited and removed. In a version
 * each has a tickbox; a left-out bullet stays in the list, struck through.
 */
const HighlightList: Component<HighlightListProps> = (props) => {
  const labelId = () => `${props.idPrefix}-label`;
  const fieldId = (index: number) => `${props.idPrefix}-${index}`;
  const isKept = (highlight: ResumeHighlight) => !activeVersion()?.excluded.includes(highlight.id);

  return (
    <div role="group" aria-labelledby={labelId()}>
      <p id={labelId()} class={activeVersion() ? "sr-only" : "mb-1 text-ui-sm"}>
        {props.label}
      </p>
      <ul class="space-y-2">
        <For each={props.highlights}>
          {(highlight, index) => (
            <li class="flex items-start gap-1">
              <Show when={activeVersion()}>
                {(version) => (
                  <Tickbox
                    checked={isKept(highlight)}
                    onChange={() => toggleExcluded(version().id, highlight.id)}
                    ariaLabel={`Keep highlight ${index() + 1}`}
                    class="-my-1.5 -ml-3.5 justify-center md:-my-1 md:-ml-2.5"
                  />
                )}
              </Show>
              <Show
                when={isKept(highlight)}
                fallback={
                  <p class="min-w-0 flex-1 py-2 text-body-sm text-fg-subtle line-through decoration-cut">
                    <span class="sr-only">Left out: </span>
                    {highlight.text || "Empty highlight"}
                  </p>
                }
              >
                <VersionedField
                  id={fieldId(index())}
                  label={`Highlight ${index() + 1}`}
                  hideLabel
                  multiline
                  rows={2}
                  value={highlight.text}
                  onInput={(value) => props.onInput(index(), value)}
                  reword={{ itemId: highlight.id, field: "text" }}
                  placeholder={props.placeholder}
                  class="min-w-0 flex-1"
                />
              </Show>
              <Show when={!activeVersion()}>
                <button
                  type="button"
                  onClick={() => props.onRemove(index())}
                  aria-label={`Remove highlight ${index() + 1}`}
                  class={`${iconButton} hover:text-danger`}
                >
                  <Close />
                </button>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <button
        type="button"
        onClick={props.onAdd}
        class="btn-quiet mt-2 -ml-2 h-11 gap-1.5 px-2 text-ui-sm text-primary md:h-9"
      >
        <Plus />
        {props.addLabel}
      </button>
    </div>
  );
};

export default HighlightList;
