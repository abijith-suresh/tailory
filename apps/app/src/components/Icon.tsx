import { Match, Switch } from "solid-js";

export type IconName =
  | "plus"
  | "close"
  | "check"
  | "chevron-down"
  | "search"
  | "filter"
  | "more"
  | "link"
  | "globe"
  | "arrow-up"
  | "arrow-down"
  | "trash";

/** A 16px line icon in the text colour. Decorative: label the control, not the icon. */
export function Icon(props: { name: IconName; class?: string }) {
  return (
    <svg
      class={props.class}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <Switch>
        <Match when={props.name === "plus"}>
          <path d="M8 3v10M3 8h10" />
        </Match>
        <Match when={props.name === "close"}>
          <path d="m4 4 8 8M12 4l-8 8" />
        </Match>
        <Match when={props.name === "check"}>
          <path d="m3.5 8.5 3 3 6-7" />
        </Match>
        <Match when={props.name === "chevron-down"}>
          <path d="m4 6 4 4 4-4" />
        </Match>
        <Match when={props.name === "search"}>
          <circle cx="7" cy="7" r="4.25" />
          <path d="m10.25 10.25 3.25 3.25" />
        </Match>
        <Match when={props.name === "filter"}>
          <path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" />
        </Match>
        <Match when={props.name === "more"}>
          <circle cx="3.5" cy="8" r="0.75" fill="currentColor" />
          <circle cx="8" cy="8" r="0.75" fill="currentColor" />
          <circle cx="12.5" cy="8" r="0.75" fill="currentColor" />
        </Match>
        <Match when={props.name === "link"}>
          <path d="M6.75 9.25a2.5 2.5 0 0 0 3.54 0l2.12-2.12a2.5 2.5 0 0 0-3.54-3.54l-.7.7" />
          <path d="M9.25 6.75a2.5 2.5 0 0 0-3.54 0L3.6 8.87a2.5 2.5 0 0 0 3.54 3.54l.7-.7" />
        </Match>
        <Match when={props.name === "globe"}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c1.6 1.6 2.25 3.5 2.25 5.5S9.6 11.9 8 13.5C6.4 11.9 5.75 10 5.75 8S6.4 4.1 8 2.5Z" />
        </Match>
        <Match when={props.name === "arrow-up"}>
          <path d="M8 13V3M4 7l4-4 4 4" />
        </Match>
        <Match when={props.name === "arrow-down"}>
          <path d="M8 3v10M4 9l4 4 4-4" />
        </Match>
        <Match when={props.name === "trash"}>
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />
        </Match>
      </Switch>
    </svg>
  );
}
