import { For, Show } from "solid-js";

import { fullTime, groupByStatus, timeAgo } from "../lib/applications";
import type { ApplicationRow } from "../server/pages";
import { PageResult, type PageResultValue } from "./PageResult";
import { STATUS_LABELS, StatusBadge } from "./StatusBadge";

type ApplicationListProps = {
  rows: readonly ApplicationRow[];
  /** Page results by application id. Missing while they load. */
  pages?: Record<string, PageResultValue>;
};

/** The applications, grouped by status, each a link to its page. */
export function ApplicationList(props: ApplicationListProps) {
  const groups = () => groupByStatus(props.rows);
  return (
    <div class="app-groups">
      <For each={groups()} keyed={(group) => group.status}>
        {(group) => (
          <section class="app-group" aria-labelledby={`group-${group().status}`}>
            <h2 class="app-group__title" id={`group-${group().status}`}>
              {STATUS_LABELS[group().status]}
              <span class="app-group__count">{group().items.length}</span>
            </h2>
            <ul class="app-list">
              <For each={group().items} keyed={(row) => row.id}>
                {(row) => (
                  <li>
                    <a class="app-row" href={`/applications/${row().id}`}>
                      <span class="app-row__main">
                        <span class="app-row__company">{row().company || "No company"}</span>
                        <span class="app-row__role">{row().role}</span>
                      </span>
                      <span class="app-row__meta">
                        <StatusBadge status={row().status} />
                        <Show when={row().archived}>
                          <span class="tag">Archived</span>
                        </Show>
                        <span class="app-row__page">
                          <Show
                            when={props.pages}
                            fallback={<span class="page-result page-result--none">…</span>}
                          >
                            {(pages) => (
                              <PageResult result={pages()[row().id]} fallback="Nothing to print" />
                            )}
                          </Show>
                        </span>
                        <time
                          class="app-row__time"
                          datetime={row().updatedAt}
                          title={fullTime(row().updatedAt)}
                        >
                          {timeAgo(row().updatedAt)}
                        </time>
                      </span>
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </section>
        )}
      </For>
    </div>
  );
}
