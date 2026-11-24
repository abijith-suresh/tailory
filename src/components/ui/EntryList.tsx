import { createSignal, createUniqueId, For, type JSX, Show } from "solid-js";

import { toggleExcluded } from "@/store/document";
import { activeVersion } from "@/store/editor";
import { iconButton } from "./buttons";
import { requestConfirm } from "./confirm";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash } from "./icons";
import Tickbox from "./Tickbox";

interface EntryListProps<T extends { id: string }> {
  items: T[];
  /** A short name for an entry, shown in its header. */
  title: (item: T) => string;
  /** A second, quieter part of the header, such as the dates. */
  meta?: (item: T) => string;
  onReorder: (items: T[]) => void;
  onRemove: (id: string) => void;
  /** The entry's own fields. */
  renderItem: (item: T) => JSX.Element;
  /** The entry's bullets, if it has any. In a version they stay open under the header. */
  renderBullets?: (item: T) => JSX.Element;
  addLabel?: string;
  onAdd?: () => void;
}

function swap<T>(items: T[], first: number, second: number) {
  const a = items[first];
  const b = items[second];
  if (a === undefined || b === undefined) return;
  items[first] = b;
  items[second] = a;
}

/**
 * The entries of a section, one card each.
 *
 * On the master a card holds every field, and the entry can be moved or removed. In a version a
 * card is a tick list: the header is the entry's tickbox, its bullets sit under it, and the other
 * fields fold away behind Details. A left-out entry folds to its struck-through header so it can
 * be ticked back.
 */
function EntryList<T extends { id: string }>(props: EntryListProps<T>): JSX.Element {
  const [openDetails, setOpenDetails] = createSignal<ReadonlySet<string>>(new Set());

  const move = (index: number, by: -1 | 1) => {
    const next = [...props.items];
    swap(next, index, index + by);
    props.onReorder(next);
  };
  const isKept = (item: T) => !activeVersion()?.excluded.includes(item.id);
  const titleOf = (item: T) => props.title(item).trim() || "Untitled entry";
  const detailsOpen = (item: T) => openDetails().has(item.id);
  const toggleDetails = (item: T) =>
    setOpenDetails((open) => {
      const next = new Set(open);
      if (!next.delete(item.id)) next.add(item.id);
      return next;
    });

  // An entry with nothing in it goes straight away; one with a title asks first, since it also
  // leaves every version.
  const remove = async (item: T) => {
    const title = props.title(item).trim();
    if (
      title &&
      !(await requestConfirm({
        title: `Delete “${title}”?`,
        body: "It goes from Master and from every version.",
        confirmLabel: "Delete",
        danger: true,
      }))
    ) {
      return;
    }
    props.onRemove(item.id);
  };

  const MasterCard = (p: { item: T; index: number }) => (
    <>
      <header class="flex items-center gap-1 border-b border-line py-0.5 pr-1 pl-4">
        <p class="min-w-0 flex-1 truncate py-3 text-ui-sm md:py-2">{titleOf(p.item)}</p>
        <button
          type="button"
          onClick={() => move(p.index, -1)}
          disabled={p.index === 0}
          aria-label="Move up"
          class={iconButton}
        >
          <ArrowUp />
        </button>
        <button
          type="button"
          onClick={() => move(p.index, 1)}
          disabled={p.index === props.items.length - 1}
          aria-label="Move down"
          class={iconButton}
        >
          <ArrowDown />
        </button>
        <button
          type="button"
          onClick={() => void remove(p.item)}
          aria-label={`Remove ${titleOf(p.item)}`}
          class={`${iconButton} hover:text-danger`}
        >
          <Trash />
        </button>
      </header>
      <div class="space-y-4 p-4">
        {props.renderItem(p.item)}
        {props.renderBullets?.(p.item)}
      </div>
    </>
  );

  const VersionCard = (p: { item: T; versionId: string }) => {
    const detailsId = createUniqueId();
    const meta = () => props.meta?.(p.item).trim();
    return (
      <>
        <header class="flex items-start gap-2 pr-1 pl-4">
          <Tickbox
            checked={isKept(p.item)}
            onChange={() => toggleExcluded(p.versionId, p.item.id)}
            class="min-w-0 flex-1"
          >
            <span class="min-w-0">
              <span
                class="text-ui-sm"
                classList={{ "text-fg-subtle line-through decoration-cut": !isKept(p.item) }}
              >
                {titleOf(p.item)}
              </span>
              <Show when={meta()}>
                <span class="text-body-sm whitespace-nowrap text-fg-subtle"> · {meta()}</span>
              </Show>
            </span>
          </Tickbox>
          <Show when={isKept(p.item)}>
            <button
              type="button"
              aria-expanded={detailsOpen(p.item)}
              aria-controls={detailsId}
              aria-label={`Details for ${titleOf(p.item)}`}
              onClick={() => toggleDetails(p.item)}
              class="btn-quiet mt-0.5 h-11 shrink-0 gap-1 px-2 text-ui-xs text-fg-muted md:h-9"
            >
              Details
              <ChevronDown class={detailsOpen(p.item) ? "rotate-180" : ""} />
            </button>
          </Show>
        </header>
        <Show when={isKept(p.item)}>
          <Show when={detailsOpen(p.item)}>
            <div id={detailsId} class="space-y-4 border-t border-line p-4">
              {props.renderItem(p.item)}
            </div>
          </Show>
          <Show when={props.renderBullets}>
            {(renderBullets) => <div class="px-4 pb-3">{renderBullets()(p.item)}</div>}
          </Show>
        </Show>
      </>
    );
  };

  return (
    <div class="space-y-3">
      <For each={props.items}>
        {(item, index) => (
          <article class="rounded-2xl bg-surface ring-1 ring-line" aria-label={titleOf(item)}>
            <Show when={activeVersion()} fallback={<MasterCard item={item} index={index()} />}>
              {(version) => <VersionCard item={item} versionId={version().id} />}
            </Show>
          </article>
        )}
      </For>

      <Show when={props.onAdd}>
        {(onAdd) => (
          <button
            type="button"
            onClick={() => onAdd()()}
            class="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-ui-sm text-primary ring-1 ring-line-strong ring-inset transition-colors hover:bg-selected md:h-9"
          >
            <Plus />
            {props.addLabel ?? "Add entry"}
          </button>
        )}
      </Show>
    </div>
  );
}

export { EntryList };
