import { For, type Component, type JSX } from "solid-js";

interface ReorderableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  onRemove: (id: string) => void;
  renderItem: (item: T, index: number) => JSX.Element;
  addLabel?: string;
  onAdd?: () => void;
}

function ReorderableList<T extends { id: string }>(
  props: ReorderableListProps<T>,
): JSX.Element {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...props.items];
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
    props.onReorder(next);
  };

  const moveDown = (index: number) => {
    if (index === props.items.length - 1) return;
    const next = [...props.items];
    [next[index + 1], next[index]] = [next[index]!, next[index + 1]!];
    props.onReorder(next);
  };

  return (
    <div class="space-y-4">
      <For each={props.items}>
        {(item, index) => (
          <div class="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            {/* Reorder controls */}
            <div class="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => moveUp(index())}
                disabled={index() === 0}
                aria-label="Move up"
                class="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveDown(index())}
                disabled={index() === props.items.length - 1}
                aria-label="Move down"
                class="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => props.onRemove(item.id)}
                aria-label="Remove"
                class="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
              >
                ✕
              </button>
            </div>
            {props.renderItem(item, index())}
          </div>
        )}
      </For>

      {props.onAdd && (
        <button
          type="button"
          onClick={props.onAdd}
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          + {props.addLabel ?? "Add entry"}
        </button>
      )}
    </div>
  );
}

export default ReorderableList as Component<ReorderableListProps<{ id: string }>>;
export { ReorderableList };
