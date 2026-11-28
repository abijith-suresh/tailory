import { createId, type ResumeSchema } from "@tailory/core";
import { For, Show } from "solid-js";

import { Button } from "../Button";
import { Field, TextArea } from "../Field";
import {
  blankEntry,
  type Entry,
  entriesOf,
  entryDates,
  entryHeading,
  type FieldSpec,
  move,
  parseList,
  SECTIONS,
  type SectionSpec,
} from "./sections";

// The profile as a form: the basics, then every section with its entries and bullets. It renders
// `resume` (a store) and changes it only through `edit`, which the page saves.

export type Edit = (change: (draft: ResumeSchema) => void) => void;

type FormProps = { resume: ResumeSchema; edit: Edit };

/** Entries added in this visit open straight away; the rest start closed. */
const fresh = new Set<string>();

/** Moves focus to an element once the DOM has caught up with a change. */
const focusSoon = (id: string, fallbackId?: string) =>
  requestAnimationFrame(() => {
    const target = document.getElementById(id) as HTMLButtonElement | null;
    const element = target && !target.disabled ? target : document.getElementById(fallbackId ?? "");
    element?.focus();
  });

const str = (value: unknown) => (typeof value === "string" ? value : "");

function Icon(props: { name: "up" | "down" | "remove" }) {
  const paths = { up: "m4 10 4-4 4 4", down: "m4 6 4 4 4-4", remove: "m4.5 4.5 7 7m0-7-7 7" };
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={paths[props.name]}
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** A small square button with an icon and a spoken label. */
function IconButton(props: {
  id?: string;
  label: string;
  icon: "up" | "down" | "remove";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={props.id}
      class={["icon-button", { "icon-button--danger": props.icon === "remove" }]}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      <Icon name={props.icon} />
    </button>
  );
}

/** A comma-separated list. It commits when you leave the field, so typing a comma never jumps. */
function ListField(props: {
  label: string;
  hint?: string;
  values: unknown;
  onCommit: (values: string[]) => void;
}) {
  const shown = () => (Array.isArray(props.values) ? props.values.join(", ") : "");
  return (
    <Field
      class="field--wide"
      label={props.label}
      hint={props.hint}
      value={shown()}
      onChange={(event) => {
        const values = parseList(event.currentTarget.value);
        event.currentTarget.value = values.join(", ");
        props.onCommit(values);
      }}
    />
  );
}

function FieldInput(props: {
  spec: FieldSpec;
  value: unknown;
  onText: (value: string) => void;
  onList: (values: string[]) => void;
}) {
  const kind = () => props.spec.kind ?? "text";
  return (
    <Show
      when={kind() === "list"}
      fallback={
        <Show
          when={kind() === "textarea"}
          fallback={
            <Field
              class={{ "field--wide": Boolean(props.spec.wide) }}
              label={props.spec.label}
              hint={props.spec.hint}
              type={kind() === "text" ? "text" : kind()}
              inputmode={kind() === "url" ? "url" : undefined}
              autocomplete="off"
              value={str(props.value)}
              onInput={(event) => props.onText(event.currentTarget.value)}
            />
          }
        >
          <TextArea
            class="field--wide"
            label={props.spec.label}
            hint={props.spec.hint}
            rows={3}
            value={str(props.value)}
            onInput={(event) => props.onText(event.currentTarget.value)}
          />
        </Show>
      }
    >
      <ListField
        label={props.spec.label}
        hint={props.spec.hint}
        values={props.value}
        onCommit={(values) => props.onList(values)}
      />
    </Show>
  );
}

/** The bullets under one entry: edit, add, remove, reorder. Enter starts a new bullet. */
function Bullets(props: { spec: SectionSpec; entry: Entry; edit: Edit }) {
  const highlights = () => props.entry.highlights ?? [];
  const change = (update: (bullets: { id: string; text: string }[]) => void) =>
    props.edit((draft) => {
      const entry = entriesOf(draft, props.spec.key).find((item) => item.id === props.entry.id);
      if (!entry) return;
      entry.highlights ??= [];
      update(entry.highlights);
    });
  const add = (at: number) => {
    const id = createId();
    change((bullets) => bullets.splice(at, 0, { id, text: "" }));
    focusSoon(`bullet-${id}`);
  };
  const addId = () => `add-bullet-${props.entry.id}`;

  return (
    <fieldset class="bullets">
      <legend class="bullets__legend">Bullets</legend>
      <Show when={highlights().length === 0}>
        <p class="bullets__empty">No bullets yet.</p>
      </Show>
      <ol class="bullets__list">
        <For each={highlights()}>
          {(bullet, index) => (
            <li class="bullet">
              <label class="visually-hidden" for={`bullet-${bullet.id}`}>
                Bullet {index() + 1}
              </label>
              <textarea
                id={`bullet-${bullet.id}`}
                class="input textarea bullet__text"
                rows={1}
                value={bullet.text}
                onInput={(event) => {
                  const text = event.currentTarget.value.replace(/\n/g, " ");
                  change((bullets) => {
                    const item = bullets.find((b) => b.id === bullet.id);
                    if (item) item.text = text;
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                    event.preventDefault();
                    add(index() + 1);
                  }
                }}
              />
              <div class="bullet__actions">
                <IconButton
                  id={`${bullet.id}-up`}
                  icon="up"
                  label={`Move bullet ${index() + 1} up`}
                  disabled={index() === 0}
                  onClick={() => {
                    change((bullets) => move(bullets, index(), index() - 1));
                    focusSoon(`${bullet.id}-up`, `${bullet.id}-down`);
                  }}
                />
                <IconButton
                  id={`${bullet.id}-down`}
                  icon="down"
                  label={`Move bullet ${index() + 1} down`}
                  disabled={index() === highlights().length - 1}
                  onClick={() => {
                    change((bullets) => move(bullets, index(), index() + 1));
                    focusSoon(`${bullet.id}-down`, `${bullet.id}-up`);
                  }}
                />
                <IconButton
                  icon="remove"
                  label={`Remove bullet ${index() + 1}`}
                  onClick={() => {
                    change((bullets) => {
                      const at = bullets.findIndex((b) => b.id === bullet.id);
                      if (at >= 0) bullets.splice(at, 1);
                    });
                    focusSoon(addId());
                  }}
                />
              </div>
            </li>
          )}
        </For>
      </ol>
      <Button
        id={addId()}
        variant="quiet"
        class="bullets__add"
        onClick={() => add(highlights().length)}
      >
        Add bullet
      </Button>
    </fieldset>
  );
}

function EntryCard(props: {
  spec: SectionSpec;
  entry: Entry;
  index: number;
  count: number;
  edit: Edit;
}) {
  const heading = () => entryHeading(props.spec, props.entry);
  const dates = () => entryDates(props.spec, props.entry);
  const change = (update: (entry: Entry) => void) =>
    props.edit((draft) => {
      const entry = entriesOf(draft, props.spec.key).find((item) => item.id === props.entry.id);
      if (entry) update(entry);
    });
  const reorder = (to: number, focusId: string, fallbackId: string) => {
    props.edit((draft) => move(entriesOf(draft, props.spec.key), props.index, to));
    focusSoon(focusId, fallbackId);
  };
  const upId = () => `${props.entry.id}-up`;
  const downId = () => `${props.entry.id}-down`;
  const name = () => heading() || `this ${props.spec.noun}`;

  return (
    <li class="entry">
      <details
        class="entry__details"
        ref={(element) => {
          if (!fresh.has(props.entry.id)) return;
          element.open = true;
          requestAnimationFrame(() =>
            element.querySelector<HTMLElement>("input, textarea")?.focus()
          );
        }}
      >
        <summary class="entry__summary">
          <span class="entry__heading">{heading() || `New ${props.spec.noun}`}</span>
          <Show when={dates()}>
            <span class="entry__dates">{dates()}</span>
          </Show>
        </summary>
        <div class="entry__body">
          <div class="entry__fields">
            <For each={props.spec.fields}>
              {(field) => (
                <FieldInput
                  spec={field}
                  value={props.entry[field.key]}
                  onText={(value) =>
                    change((entry) => {
                      entry[field.key] = value;
                    })
                  }
                  onList={(values) =>
                    change((entry) => {
                      entry[field.key] = values;
                    })
                  }
                />
              )}
            </For>
          </div>
          <Show when={props.spec.highlights}>
            <Bullets spec={props.spec} entry={props.entry} edit={props.edit} />
          </Show>
          <div class="entry__actions">
            <Button
              id={upId()}
              variant="quiet"
              disabled={props.index === 0}
              aria-label={`Move ${name()} up`}
              onClick={() => reorder(props.index - 1, upId(), downId())}
            >
              Move up
            </Button>
            <Button
              id={downId()}
              variant="quiet"
              disabled={props.index === props.count - 1}
              aria-label={`Move ${name()} down`}
              onClick={() => reorder(props.index + 1, downId(), upId())}
            >
              Move down
            </Button>
            <Button
              variant="quiet"
              class="entry__remove"
              aria-label={`Remove ${name()}`}
              onClick={() => {
                props.edit((draft) => {
                  const list = entriesOf(draft, props.spec.key);
                  const at = list.findIndex((item) => item.id === props.entry.id);
                  if (at >= 0) list.splice(at, 1);
                });
                focusSoon(`add-${props.spec.key}`);
              }}
            >
              Remove {props.spec.noun}
            </Button>
          </div>
        </div>
      </details>
    </li>
  );
}

function Section(props: { spec: SectionSpec; resume: ResumeSchema; edit: Edit }) {
  const entries = () => (props.resume[props.spec.key] ?? []) as unknown as Entry[];
  const titleId = () => `section-${props.spec.key}`;
  return (
    <section class="panel profile-section" aria-labelledby={titleId()}>
      <div class="profile-section__head">
        <h2 class="panel__title" id={titleId()}>
          {props.spec.title}
          <Show when={entries().length > 0}>
            <span class="profile-section__count" aria-hidden="true">
              {" "}
              {entries().length}
            </span>
          </Show>
        </h2>
        <Button
          id={`add-${props.spec.key}`}
          onClick={() => {
            const id = createId();
            fresh.add(id);
            props.edit((draft) => {
              entriesOf(draft, props.spec.key).push(blankEntry(props.spec, id));
            });
          }}
        >
          Add {props.spec.noun}
        </Button>
      </div>
      <Show when={entries().length > 0}>
        <ol class="entries">
          <For each={entries()}>
            {(entry, index) => (
              <EntryCard
                spec={props.spec}
                entry={entry}
                index={index()}
                count={entries().length}
                edit={props.edit}
              />
            )}
          </For>
        </ol>
      </Show>
    </section>
  );
}

const BASICS: FieldSpec[] = [
  { key: "name", label: "Name" },
  { key: "label", label: "Headline", hint: "Such as Senior backend engineer" },
  { key: "email", label: "Email", kind: "email" },
  { key: "phone", label: "Phone", kind: "tel" },
  { key: "url", label: "Website", kind: "url" },
];

const LOCATION: FieldSpec[] = [
  { key: "city", label: "City" },
  { key: "region", label: "Region" },
  { key: "countryCode", label: "Country code", hint: "Such as US or DE" },
];

function Basics(props: FormProps) {
  const basics = () => props.resume.basics;
  const profiles = () => basics().profiles ?? [];
  const setBasic = (key: string, value: string) =>
    props.edit((draft) => {
      (draft.basics as unknown as Record<string, unknown>)[key] = value;
    });

  return (
    <section class="panel profile-section" aria-labelledby="section-basics">
      <h2 class="panel__title" id="section-basics">
        Basics
      </h2>
      <div class="entry__fields profile-section__fields">
        <For each={BASICS}>
          {(field) => (
            <FieldInput
              spec={field}
              value={(basics() as unknown as Record<string, unknown>)[field.key]}
              onText={(value) => setBasic(field.key, value)}
              onList={() => {}}
            />
          )}
        </For>
        <For each={LOCATION}>
          {(field) => (
            <FieldInput
              spec={field}
              value={(basics().location as Record<string, unknown> | undefined)?.[field.key]}
              onText={(value) =>
                props.edit((draft) => {
                  draft.basics.location ??= {};
                  (draft.basics.location as Record<string, unknown>)[field.key] = value;
                })
              }
              onList={() => {}}
            />
          )}
        </For>
        <FieldInput
          spec={{ key: "summary", label: "Summary", kind: "textarea" }}
          value={basics().summary}
          onText={(value) => setBasic("summary", value)}
          onList={() => {}}
        />
      </div>

      <fieldset class="links">
        <legend class="bullets__legend">Profiles and links</legend>
        <ol class="links__list">
          <For each={profiles()} keyed={false}>
            {(profile, index) => (
              <li class="link-row">
                <Field
                  label="Site"
                  hint={index === 0 ? "Such as GitHub" : undefined}
                  value={profile().network ?? ""}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    props.edit((draft) => {
                      const item = draft.basics.profiles?.[index];
                      if (item) item.network = value;
                    });
                  }}
                />
                <Field
                  label="Username"
                  value={profile().username ?? ""}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    props.edit((draft) => {
                      const item = draft.basics.profiles?.[index];
                      if (item) item.username = value;
                    });
                  }}
                />
                <Field
                  label="Link"
                  type="url"
                  value={profile().url ?? ""}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    props.edit((draft) => {
                      const item = draft.basics.profiles?.[index];
                      if (item) item.url = value;
                    });
                  }}
                />
                <IconButton
                  icon="remove"
                  label={`Remove ${profile().network || `link ${index + 1}`}`}
                  onClick={() => {
                    props.edit((draft) => {
                      draft.basics.profiles?.splice(index, 1);
                    });
                    focusSoon("add-profile");
                  }}
                />
              </li>
            )}
          </For>
        </ol>
        <Button
          id="add-profile"
          variant="quiet"
          class="bullets__add"
          onClick={() =>
            props.edit((draft) => {
              draft.basics.profiles ??= [];
              draft.basics.profiles.push({ id: createId(), network: "", username: "", url: "" });
            })
          }
        >
          Add link
        </Button>
      </fieldset>
    </section>
  );
}

/** Every part of the profile, ready to edit. */
export function ProfileForm(props: FormProps) {
  return (
    <div class="stack">
      <Basics resume={props.resume} edit={props.edit} />
      <For each={SECTIONS}>
        {(spec) => <Section spec={spec} resume={props.resume} edit={props.edit} />}
      </For>
    </div>
  );
}
