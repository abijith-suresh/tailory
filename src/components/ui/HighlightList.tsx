import { type Component, For } from "solid-js";

import Textarea from "@/components/ui/Textarea";

interface HighlightListProps {
  highlights: string[];
  idPrefix: string;
  label: string;
  addLabel: string;
  placeholder: string;
  onInput: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

const HighlightList: Component<HighlightListProps> = (props) => {
  const labelId = () => `${props.idPrefix}-label`;
  const textareaId = (index: number) => `${props.idPrefix}-${index}`;

  return (
    <div class="space-y-1">
      <p id={labelId()} class="block text-sm font-medium text-gray-700">
        {props.label}
      </p>
      <div class="space-y-2">
        <For each={props.highlights}>
          {(highlight, index) => (
            <div class="flex gap-2">
              <label for={textareaId(index())} class="sr-only">
                Highlight {index() + 1}
              </label>
              <Textarea
                id={textareaId(index())}
                aria-describedby={labelId()}
                value={highlight}
                onInput={(value) => props.onInput(index(), value)}
                placeholder={props.placeholder}
                rows={2}
              />
              <button
                type="button"
                onClick={() => props.onRemove(index())}
                aria-label="Remove highlight"
                class="mt-1 flex-shrink-0 text-red-400 transition-colors active:opacity-70 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )}
        </For>
        <button
          type="button"
          onClick={props.onAdd}
          class="text-xs text-[#1d6648] transition-colors hover:underline"
        >
          + {props.addLabel}
        </button>
      </div>
    </div>
  );
};

export default HighlightList;
