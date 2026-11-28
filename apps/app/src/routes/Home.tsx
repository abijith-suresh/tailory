import { Title } from "@solidjs/meta";
import { createMemo, createSignal, isPending, Loading, onCleanup, Show } from "solid-js";

import { ApplicationList } from "../components/ApplicationList";
import { LinkButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { EmptyState } from "../components/EmptyState";
import { NewApplication } from "../components/NewApplication";
import { getApplicationRows, getPageResults } from "../server/functions";

export default function Home() {
  const [typed, setTyped] = createSignal("");
  const [search, setSearch] = createSignal("");
  const [showArchived, setShowArchived] = createSignal(false);

  // Search as you type, once typing pauses.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onSearch = (value: string) => {
    setTyped(value);
    clearTimeout(timer);
    timer = setTimeout(() => setSearch(value.trim()), 200);
  };
  onCleanup(() => clearTimeout(timer));

  const home = createMemo(() => getApplicationRows(search(), showArchived()));
  // Fitting every row takes a moment, so page results come after the list.
  const pages = createMemo(() => getPageResults(home().rows.map((row) => row.id)));
  const filtered = () => search() !== "" || showArchived();
  const count = () => home().rows.length;

  return (
    <>
      <Title>Applications · Tailory</Title>
      <div class="page-head">
        <div>
          <h1 class="page-title">Applications</h1>
          <p class="page-lede">Each application is your resume cut for one job.</p>
        </div>
        <NewApplication />
      </div>
      <Loading fallback={<p class="muted">Loading applications…</p>}>
        <Show
          when={home().hasAny}
          fallback={
            <EmptyState
              title="No applications yet"
              actions={
                <LinkButton variant="primary" href="/connect">
                  Connect an agent
                </LinkButton>
              }
            >
              <p>
                Ask your agent to tailor your resume for a job and the application shows up here,
                with its status and the resume it will send.
              </p>
            </EmptyState>
          }
        >
          <search class="toolbar">
            <div class="field toolbar__search">
              <label class="visually-hidden" for="application-search">
                Search applications
              </label>
              <input
                id="application-search"
                class="input"
                type="search"
                placeholder="Search company or role"
                autocomplete="off"
                value={typed()}
                onInput={(event) => onSearch(event.currentTarget.value)}
              />
            </div>
            <Checkbox
              label="Show archived"
              checked={showArchived()}
              onChange={(event) => setShowArchived(event.currentTarget.checked)}
            />
          </search>
          <p class="visually-hidden" role="status">
            {filtered() ? `${count()} ${count() === 1 ? "application" : "applications"}` : ""}
          </p>
          <div class={["list-frame", { "list-frame--pending": isPending(() => home()) }]}>
            <Show
              when={count() > 0}
              fallback={
                <EmptyState title="No matches" level={2}>
                  <p>
                    {search()
                      ? `No application's company or role contains “${search()}”.`
                      : "Every application is archived."}{" "}
                    <Show when={!showArchived()}>Archived applications are hidden.</Show>
                  </p>
                </EmptyState>
              }
            >
              <Loading fallback={<ApplicationList rows={home().rows} />}>
                <ApplicationList rows={home().rows} pages={pages()} />
              </Loading>
            </Show>
          </div>
        </Show>
      </Loading>
    </>
  );
}
