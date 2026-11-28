import { Title } from "@solidjs/meta";
import { createSignal, For } from "solid-js";

import { Button, LinkButton } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { CountryPicker } from "../components/Combobox";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea } from "../components/Field";
import { Icon } from "../components/Icon";
import { LinkField } from "../components/LinkField";
import { Menu } from "../components/Menu";
import { Segmented } from "../components/Segmented";
import { Select } from "../components/Select";
import { SideNav } from "../components/SideNav";
import { STATUS_LABELS, STATUSES, StatusBadge } from "../components/StatusBadge";
import { BOARD_STATUSES, OfferTag, OUTCOMES, OutcomeTag, StatusTag } from "../components/StatusTag";
import { Switch } from "../components/Switch";
import { Tabs } from "../components/Tabs";
import { flip, land } from "../lib/motion";
import { toast } from "../lib/toast";

type Entry = { id: string; role: string; company: string; start: string };

const ENTRIES: Entry[] = [
  { id: "cartwheel", role: "Senior frontend engineer", company: "Cartwheel", start: "2022-03" },
  { id: "fernway", role: "Frontend engineer", company: "Fernway Travel", start: "2019-06" },
  { id: "pixelmint", role: "Web developer", company: "Pixelmint Studio", start: "2017-01" },
];

const newestFirst = (list: Entry[]) => [...list].sort((a, b) => b.start.localeCompare(a.start));

function Section(props: { id: string; title: string; children: unknown }) {
  return (
    <section class="panel stack dev-section" aria-labelledby={props.id}>
      <h2 class="panel__title" id={props.id}>
        {props.title}
      </h2>
      {props.children as never}
    </section>
  );
}

/** FLIP demo: an entry added out of order slides the rows apart and lands in date order. */
function FlipDemo() {
  const [entries, setEntries] = createSignal(ENTRIES);
  let list: HTMLUListElement | undefined;
  let added = 0;

  const add = async () => {
    if (!list) return;
    added += 1;
    const entry = {
      id: `new-${added}`,
      role: added % 2 ? "Frontend lead" : "Design engineer",
      company: added % 2 ? "Lighthouse Studio" : "Northbeam Labs",
      start: added % 2 ? "2018-09" : "2020-11",
    };
    const landed = await flip(list, () => setEntries((all) => newestFirst([...all, entry])));
    const row = list.querySelector<HTMLElement>(`[data-flip-key="${landed[0]}"]`);
    if (row) land(row);
  };

  return (
    <>
      <div class="panel__actions">
        <Button onClick={() => void add()}>
          <Icon name="plus" />
          Add a role
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            if (list) void flip(list, () => setEntries((all) => [...all].reverse()));
          }}
        >
          Reverse
        </Button>
        <Button variant="quiet" onClick={() => setEntries(ENTRIES)}>
          Reset
        </Button>
      </div>
      <ul
        class="dev-rows"
        ref={(element) => {
          list = element;
        }}
      >
        <For each={entries()}>
          {(entry) => (
            <li class="dev-row" data-flip-key={entry.id}>
              <b>{entry.role}</b>
              <span>{entry.company}</span>
              <span class="dev-row__when">{entry.start.replace("-", " · ")}</span>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}

// Every shared component in one place, for design review. Served by `npm run dev` only.
export default function Components() {
  const statusOptions = STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }));
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogError, setDialogError] = createSignal("");
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [archived, setArchived] = createSignal(false);
  const [theme, setTheme] = createSignal<"system" | "light" | "dark">("system");
  const [pages, setPages] = createSignal<"1" | "2" | "3">("1");
  const [country, setCountry] = createSignal<string | undefined>("PT");
  const [current, setCurrent] = createSignal(true);
  const [busy, setBusy] = createSignal(false);

  const applyTheme = (value: "system" | "light" | "dark") => {
    setTheme(value);
    if (value === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
  };

  return (
    <>
      <Title>Components · Tailory</Title>
      <div class="page-head">
        <h1 class="page-title">Components</h1>
        <Segmented
          label="Theme"
          value={theme()}
          onChange={applyTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
      <div class="stack">
        <Section id="c-buttons" title="Buttons">
          <div class="dev-row-wrap">
            <Button variant="primary">
              <Icon name="plus" />
              New application
            </Button>
            <Button>Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="danger-solid">Erase all data</Button>
            <Button icon aria-label="More">
              <Icon name="more" />
            </Button>
            <Button variant="quiet" icon aria-label="Close">
              <Icon name="close" />
            </Button>
            <Button size="small">
              <Icon name="plus" />
              Add link
            </Button>
            <Button
              variant="primary"
              busy={busy()}
              onClick={() => {
                setBusy(true);
                setTimeout(() => setBusy(false), 1500);
              }}
            >
              Save
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <LinkButton href="#c-buttons">Link button</LinkButton>
          </div>
          <p class="muted">Press and hold any of them: they go down fast and spring back.</p>
        </Section>

        <Section id="c-fields" title="Fields">
          <div class="dev-grid">
            <Field label="Company" placeholder="Northwind" />
            <Field label="Posting link" optional type="url" placeholder="https://" />
            <Field label="Start" type="month" error="Start is needed" />
            <Field
              label="End"
              type="month"
              disabled={current()}
              aside={
                <Switch
                  size="small"
                  label="Current"
                  checked={current()}
                  onChange={(event) => setCurrent(event.currentTarget.checked)}
                />
              }
            />
            <Select label="Status" options={statusOptions} value="interviewing" />
            <CountryPicker value={country()} onChange={setCountry} />
            <LinkField label="Link" value="https://github.com/ada" onInput={() => {}} />
            <LinkField label="Website" value="" placeholder="https://" onInput={() => {}} />
          </div>
          <TextArea label="Job description" rows={3} />
        </Section>

        <Section id="c-choice" title="Choices">
          <div class="dev-row-wrap">
            <Checkbox label="Save to profile too" />
            <Checkbox label="Include a summary" checked />
            <Switch label="Tighten" />
            <Switch label="Highlights" checked />
            <Segmented
              label="Pages"
              value={pages()}
              onChange={setPages}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          </div>
        </Section>

        <Section id="c-tags" title="Status and outcome">
          <div class="dev-row-wrap">
            <For each={BOARD_STATUSES}>{(status) => <StatusTag status={status} />}</For>
          </div>
          <div class="dev-row-wrap">
            <OfferTag />
            <For each={OUTCOMES}>{(outcome) => <OutcomeTag outcome={outcome} />}</For>
          </div>
          <div class="dev-row-wrap">
            <For each={STATUSES}>{(status) => <StatusBadge status={status} />}</For>
          </div>
        </Section>

        <Section id="c-overlays" title="Dialog, menu and toast">
          <div class="dev-row-wrap">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Add role
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Erase all data…
            </Button>
            <Menu
              triggerClass="button button--quiet"
              active={archived()}
              trigger={
                <>
                  <Icon name="filter" />
                  View
                </>
              }
              items={[
                {
                  kind: "checkbox",
                  label: "Show archived",
                  checked: archived(),
                  onChange: setArchived,
                },
              ]}
            />
            <Menu
              triggerClass="button button--secondary button--icon"
              triggerLabel="More actions"
              align="end"
              trigger={<Icon name="more" />}
              items={[
                { kind: "label", label: "Application" },
                { label: "Duplicate", onSelect: () => toast("Duplicated") },
                { label: "Archive", onSelect: () => toast("Archived Northwind") },
                { kind: "separator" },
                {
                  label: "Delete",
                  danger: true,
                  onSelect: () =>
                    toast("Deleted Northwind", { action: { label: "Undo", run: () => {} } }),
                },
              ]}
            />
            <Button
              onClick={() =>
                toast("Orbital Maps moved to Applied", {
                  action: { label: "Undo", run: () => toast("Moved back to Drafting") },
                })
              }
            >
              Toast with Undo
            </Button>
            <Button
              onClick={() =>
                toast("Couldn't save. Check your connection.", {
                  tone: "error",
                  action: { label: "Retry", run: () => {} },
                })
              }
            >
              Error toast
            </Button>
          </div>
          <Dialog
            open={dialogOpen()}
            onClose={() => setDialogOpen(false)}
            title="Add role"
            onSubmit={(event) => {
              const start = new FormData(event.currentTarget).get("start");
              if (!start) return setDialogError("Start is needed");
              setDialogError("");
              setDialogOpen(false);
              toast("Added Frontend lead");
            }}
            footer={
              <>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">
                  Add role
                </Button>
              </>
            }
          >
            <div class="dev-grid">
              <Field name="role" label="Role" />
              <Field name="company" label="Company" />
              <Field name="start" label="Start" type="month" error={dialogError()} />
              <CountryPicker value={country()} onChange={setCountry} />
            </div>
          </Dialog>
          <Dialog
            open={confirmOpen()}
            onClose={() => setConfirmOpen(false)}
            title="Erase all data?"
            size="small"
            dismissable
            footer={
              <>
                <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button variant="danger-solid" onClick={() => setConfirmOpen(false)}>
                  Erase 6 applications
                </Button>
              </>
            }
          >
            <p class="muted">Your profile and 6 applications go. This can't be undone.</p>
          </Dialog>
        </Section>

        <Section id="c-motion" title="Motion: rows that re-sort">
          <FlipDemo />
        </Section>

        <Section id="c-nav" title="Side navigation and tabs">
          <div class="dev-split">
            <SideNav
              label="Sections"
              current="#work"
              items={[
                { href: "#basics", label: "Basics" },
                { href: "#summary", label: "Summary" },
                { href: "#work", label: "Work", count: 5 },
                { href: "#projects", label: "Projects", count: 3 },
                { href: "#education", label: "Education", count: 2 },
              ]}
            />
            <Tabs
              label="Client"
              tabs={["Claude Code", "Codex", "Cursor", "Other"].map((name) => ({
                id: name.toLowerCase().replace(" ", "-"),
                label: name,
                content: () => <p class="muted">How to connect {name}.</p>,
              }))}
            />
          </div>
        </Section>

        <EmptyState title="No certificates yet." actions={<Button size="small">Add</Button>} />
      </div>
    </>
  );
}
