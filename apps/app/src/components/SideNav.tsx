import { For, Show } from "solid-js";

export type SideNavItem = {
  href: string;
  label: string;
  /** A count beside the label, such as entries in a section ("5", or "3/4" in Tailor). */
  count?: string | number;
};

type SideNavProps = {
  /** Names the landmark: "Sections", "Settings". */
  label: string;
  items: readonly SideNavItem[];
  /** The href of the current item. */
  current: string;
  class?: string;
};

/**
 * The left navigation of the section editor and Settings. The current item has the neutral tint
 * and a cobalt bar; on phones it becomes a row of chips that scrolls sideways.
 */
export function SideNav(props: SideNavProps) {
  return (
    <nav class={["sidenav", props.class]} aria-label={props.label}>
      <ul class="sidenav__list">
        <For each={props.items}>
          {(item) => (
            <li>
              <a
                class="sidenav__link"
                href={item.href}
                aria-current={item.href === props.current ? "page" : "false"}
              >
                <span>{item.label}</span>
                <Show when={item.count !== undefined}>
                  <span class="sidenav__count">{item.count}</span>
                </Show>
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
