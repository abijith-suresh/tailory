import { createSignal, flush } from "solid-js";
import { describe, expect, it } from "vitest";

import { click, mount, press, type } from "../testing/dom";
import { CountryPicker, filterOptions } from "./Combobox";

function Picker(props: { initial?: string }) {
  const [country, setCountry] = createSignal<string | undefined>(props.initial);
  return (
    <>
      <CountryPicker id="country" value={country()} onChange={setCountry} />
      <output id="value">{country() ?? ""}</output>
    </>
  );
}

const input = () => document.getElementById("country") as HTMLInputElement;
const value = () => document.getElementById("value")?.textContent;
const options = () =>
  [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent?.slice(2));
const active = () => document.getElementById(input().getAttribute("aria-activedescendant") ?? "");

describe("filterOptions", () => {
  const list = [
    { value: "DE", label: "Germany", badge: "DE" },
    { value: "NG", label: "Nigeria", badge: "NG" },
    { value: "CI", label: "Côte d’Ivoire", badge: "CI" },
    { value: "GE", label: "Georgia", badge: "GE" },
  ];

  it("puts word starts before matches inside a word", () => {
    expect(filterOptions(list, "ger").map((o) => o.label)).toEqual(["Germany", "Nigeria"]);
  });

  it("matches a code exactly, first, and ignores accents", () => {
    expect(filterOptions(list, "ge").map((o) => o.value)[0]).toBe("GE");
    expect(filterOptions(list, "cote").map((o) => o.value)).toEqual(["CI"]);
  });
});

describe("CountryPicker", () => {
  it("is a combobox that shows the chosen country and its code", () => {
    mount(() => <Picker initial="PT" />);
    expect(input().getAttribute("role")).toBe("combobox");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().value).toBe("Portugal");
    expect(document.querySelector(".combobox__badge")?.textContent).toBe("PT");
    expect(document.querySelector('label[for="country"]')?.textContent).toBe("Country");
  });

  it("filters as you type and chooses with the arrows and Enter", () => {
    mount(() => <Picker initial="PT" />);
    input().focus();
    type(input(), "ger");
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(options()[0]).toBe("Germany");
    expect(options()).toContain("Nigeria");
    expect(active()?.textContent).toContain("Germany");

    press("ArrowDown");
    expect(active()?.textContent).toContain(options()[1]);
    press("ArrowUp");
    expect(active()?.textContent).toContain("Germany");

    const enter = press("Enter");
    expect(enter.defaultPrevented).toBe(true);
    expect(value()).toBe("DE");
    expect(input().value).toBe("Germany");
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("puts the choice back on Escape", () => {
    mount(() => <Picker initial="PT" />);
    input().focus();
    type(input(), "fra");
    press("Escape");
    expect(input().value).toBe("Portugal");
    expect(value()).toBe("PT");
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("chooses with a click", () => {
    mount(() => <Picker />);
    input().focus();
    type(input(), "japan");
    click(document.querySelector('[role="option"]'));
    expect(value()).toBe("JP");
  });

  it("keeps an exact name or code typed before leaving, and nothing else", () => {
    mount(() => <Picker initial="PT" />);
    input().focus();
    type(input(), "es");
    input().blur();
    flush();
    expect(value()).toBe("ES");

    input().focus();
    type(input(), "nowhere");
    input().blur();
    flush();
    expect(value()).toBe("ES");
    expect(input().value).toBe("Spain");
  });
});
