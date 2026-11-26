import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";

type EmptyStateProps = {
  title: string;
  children?: JSX.Element;
  /** Buttons or links under the text. */
  actions?: JSX.Element;
  /** Heading level for the title; pick the one that fits the page's outline. */
  level?: 2 | 3;
};

/** What goes where content will be: a title, a line or two of text, and what to do next. */
export function EmptyState(props: EmptyStateProps) {
  return (
    <section class="empty-state">
      <Show when={props.level === 3} fallback={<h2 class="empty-state__title">{props.title}</h2>}>
        <h3 class="empty-state__title">{props.title}</h3>
      </Show>
      <Show when={props.children}>
        <div class="empty-state__text">{props.children}</div>
      </Show>
      <Show when={props.actions}>
        <div class="empty-state__actions">{props.actions}</div>
      </Show>
    </section>
  );
}
