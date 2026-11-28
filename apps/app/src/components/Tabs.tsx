import type { JSX } from "@solidjs/web";
import { createSignal, createUniqueId, For } from "solid-js";

export type Tab = { id: string; label: string; content: () => JSX.Element };

type TabsProps = {
  /** Names the tab list: "Client". */
  label: string;
  tabs: readonly Tab[];
  /** The tab shown first. Defaults to the first one. */
  initial?: string;
  onChange?: (id: string) => void;
  class?: string;
};

/**
 * Tabs. Left and Right move between tabs and show each at once; Home and End jump to the ends.
 * Only the chosen tab is in the Tab order, so Tab goes straight from the list into the panel.
 */
export function Tabs(props: TabsProps) {
  const base = createUniqueId();
  const [selected, setSelected] = createSignal(props.initial ?? props.tabs[0]?.id ?? "");
  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => `${base}-panel-${id}`;

  const choose = (id: string, focus: boolean) => {
    setSelected(id);
    props.onChange?.(id);
    if (focus) document.getElementById(tabId(id))?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const ids = props.tabs.map((tab) => tab.id);
    const at = ids.indexOf(selected());
    const to: Record<string, number> = {
      ArrowRight: (at + 1) % ids.length,
      ArrowLeft: (at - 1 + ids.length) % ids.length,
      Home: 0,
      End: ids.length - 1,
    };
    const next = to[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(ids[next], true);
  };

  return (
    <div class={["tabs", props.class]}>
      <div class="tabs__list" role="tablist" aria-label={props.label} onKeyDown={onKeyDown}>
        <For each={props.tabs}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              class="tabs__tab"
              id={tabId(tab.id)}
              aria-selected={selected() === tab.id ? "true" : "false"}
              aria-controls={panelId(tab.id)}
              tabindex={selected() === tab.id ? 0 : -1}
              onClick={() => choose(tab.id, false)}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>
      <For each={props.tabs}>
        {(tab) => (
          <div
            class="tabs__panel"
            role="tabpanel"
            id={panelId(tab.id)}
            aria-labelledby={tabId(tab.id)}
            tabindex="0"
            hidden={selected() !== tab.id}
          >
            {tab.content()}
          </div>
        )}
      </For>
    </div>
  );
}
