import { createEffect, createMemo, createSignal, For, onCleanup, Show, untrack } from "solid-js";

import { countries } from "../lib/countries";
import { FieldHead, fieldIds } from "./Field";
import { Icon } from "./Icon";

export type ComboboxOption = { value: string; label: string; badge?: string };

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Options that match what was typed, best first: an exact badge (a country code), then labels
 * whose words start with it, then labels that contain it. Accents don't matter.
 */
export function filterOptions<T extends ComboboxOption>(options: readonly T[], query: string): T[] {
  const q = fold(query.trim());
  if (q === "") return [...options];
  const exact: T[] = [];
  const starts: T[] = [];
  const contains: T[] = [];
  for (const option of options) {
    const label = fold(option.label);
    if (option.badge && fold(option.badge) === q) exact.push(option);
    else if (label.split(/[\s,()-]+/).some((word) => word.startsWith(q))) starts.push(option);
    else if (label.includes(q)) contains.push(option);
  }
  return [...exact, ...starts, ...contains];
}

type ComboboxProps = {
  label: string;
  options: readonly ComboboxOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  error?: string;
  optional?: boolean;
  class?: string;
};

const GAP = 4;

/**
 * A text input that filters a list as you type, in the ARIA combobox pattern. Down and Up move
 * through the matches, Enter chooses one, Escape closes the list and puts the choice back.
 * Leaving the field keeps an exact match ("germany", "DE") and otherwise puts the choice back.
 * The list is a popover, so it shows above a dialog without being clipped.
 */
export function Combobox(props: ComboboxProps) {
  const ids = fieldIds(props);
  const listId = `${ids.id}-list`;
  const [query, setQuery] = createSignal<string | null>(null);
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);
  let input: HTMLInputElement | undefined;
  let list: HTMLDivElement | undefined;

  const selected = createMemo(() => props.options.find((option) => option.value === props.value));
  const matches = createMemo(() => filterOptions(props.options, query() ?? ""));
  const shown = () => query() ?? selected()?.label ?? "";
  const optionId = (option: ComboboxOption) => `${ids.id}-option-${option.value}`;
  const activeOption = () => (open() ? matches()[active()] : undefined);

  const place = () => {
    if (!input || !list) return;
    const box = input.getBoundingClientRect();
    list.style.left = `${box.left}px`;
    list.style.width = `${box.width}px`;
    const height = list.offsetHeight;
    const below = box.bottom + GAP + height <= window.innerHeight || box.top - GAP - height < 0;
    list.style.top = `${below ? box.bottom + GAP : box.top - GAP - height}px`;
  };

  const show = () => {
    if (open()) return;
    setOpen(true);
    list?.showPopover();
  };

  // Placed once the matches are in the list, so it knows how tall it is and which way fits.
  createEffect(
    () => open() && matches().length,
    (showing) => {
      if (showing !== false) place();
    }
  );

  const hide = () => {
    if (!open()) return;
    setOpen(false);
    list?.hidePopover();
  };

  const reveal = (index: number) => {
    setActive(index);
    const option = matches()[index];
    if (option) document.getElementById(optionId(option))?.scrollIntoView?.({ block: "nearest" });
  };

  const choose = (option: ComboboxOption | undefined) => {
    setQuery(null);
    hide();
    if (option && option.value !== props.value) props.onChange(option.value);
  };

  const onReposition = () => {
    if (open()) place();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    onCleanup(() => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    });
  }
  onCleanup(() => {
    if (untrack(open)) list?.hidePopover();
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const count = matches().length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open()) {
          show();
          const at = matches().findIndex((option) => option.value === props.value);
          reveal(Math.max(0, at));
        } else if (count > 0) reveal((active() + 1) % count);
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open()) show();
        if (count > 0) reveal((active() - 1 + count) % count);
        return;
      case "Enter":
        if (!open()) return;
        event.preventDefault();
        choose(activeOption());
        return;
      case "Escape":
        if (!open() && query() === null) return;
        event.preventDefault();
        setQuery(null);
        hide();
        return;
      case "Tab":
        if (open() && query() !== null) choose(activeOption());
        return;
    }
  };

  const onBlur = () => {
    const typed = query();
    if (typed === null) return hide();
    const q = fold(typed.trim());
    if (q === "") {
      setQuery(null);
      hide();
      if (props.value !== undefined) props.onChange(undefined);
      return;
    }
    const exact = props.options.find(
      (option) => fold(option.label) === q || (option.badge && fold(option.badge) === q)
    );
    choose(exact);
  };

  return (
    <div class={props.class ? `field ${props.class}` : "field"}>
      <FieldHead
        for={ids.id}
        label={props.label}
        error={props.error}
        errorId={ids.errorId}
        optional={props.optional}
      />
      <div class={["combobox", { "combobox--badged": Boolean(selected()?.badge) }]}>
        <input
          ref={(element) => {
            input = element;
          }}
          id={ids.id}
          name={props.name}
          class="input combobox__input"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck={false}
          placeholder={props.placeholder}
          aria-autocomplete="list"
          aria-expanded={open() ? "true" : "false"}
          aria-controls={listId}
          aria-activedescendant={
            activeOption() ? optionId(activeOption() as ComboboxOption) : undefined
          }
          aria-describedby={ids.describedBy()}
          aria-invalid={props.error ? "true" : undefined}
          value={shown()}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
            show();
          }}
          onClick={() => (open() ? hide() : show())}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
        <Show when={selected()?.badge}>
          <span class="combobox__badge" aria-hidden="true">
            {selected()?.badge}
          </span>
        </Show>
        <Icon name="chevron-down" class="combobox__arrow" />
        <div
          ref={(element) => {
            list = element;
          }}
          id={listId}
          class="combobox__list"
          role="listbox"
          aria-label={props.label}
          popover="manual"
        >
          <For
            each={open() ? matches() : []}
            fallback={<div class="combobox__empty">No matches</div>}
          >
            {(option, index) => (
              // Options never take focus: the input keeps it and points at the active one with
              // aria-activedescendant, and the input's keys choose. A click is for pointers.
              // biome-ignore lint/a11y/useFocusableInteractive: see above
              // biome-ignore lint/a11y/useKeyWithClickEvents: see above
              <div
                id={optionId(option)}
                class="combobox__option"
                role="option"
                aria-selected={option.value === props.value ? "true" : "false"}
                data-active={index() === active() ? "" : undefined}
                // Keep focus in the input, so the choice lands before blur.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <Show when={option.badge}>
                  <span class="combobox__option-badge" aria-hidden="true">
                    {option.badge}
                  </span>
                </Show>
                {option.label}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

const countryOptions = () =>
  countries().map((country) => ({ value: country.code, label: country.name, badge: country.code }));

/** The country picker: every country by name, its ISO code on the left. */
export function CountryPicker(
  props: Omit<ComboboxProps, "options" | "label"> & { label?: string }
) {
  return <Combobox {...props} label={props.label ?? "Country"} options={countryOptions()} />;
}
