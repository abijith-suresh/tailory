import { describe, expect, it } from "vitest";

import { mount, type } from "../testing/dom";
import { LinkField } from "./LinkField";

describe("LinkField", () => {
  it("names the site as you type and ties the name to the field", () => {
    let saved = "";
    mount(() => <LinkField id="link" label="Link" value="" onInput={(value) => (saved = value)} />);
    const input = document.getElementById("link") as HTMLInputElement;
    expect(document.querySelector(".link-input__site")).toBeNull();

    type(input, "github.com/ada");
    const site = document.querySelector(".link-input__site");
    expect(site?.textContent).toBe("GitHub");
    expect(site?.hasAttribute("data-known")).toBe(true);
    expect(input.getAttribute("aria-describedby")).toBe(site?.id);
    expect(saved).toBe("github.com/ada");

    type(input, "https://ada.dev");
    expect(document.querySelector(".link-input__site")?.textContent).toBe("Website");
  });
});
