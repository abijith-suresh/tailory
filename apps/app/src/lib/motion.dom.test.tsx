import { createSignal, For } from "solid-js";
import { describe, expect, it } from "vitest";

import { mount } from "../testing/dom";
import { duration, flip } from "./motion";

describe("flip", () => {
  it("applies the change and reports the rows that are new", async () => {
    const [rows, setRows] = createSignal(["b", "c"]);
    const { container } = mount(() => (
      <ul>
        <For each={rows()}>{(row) => <li data-flip-key={row}>{row}</li>}</For>
      </ul>
    ));
    const list = container.querySelector("ul") as HTMLElement;
    const added = await flip(list, () => setRows(["a", "b", "c"]));
    expect(added).toEqual(["a"]);
    expect(list.textContent).toBe("abc");
  });
});

describe("duration", () => {
  it("falls back to the scale when the stylesheet isn't there", () => {
    expect(duration("move")).toBe(320);
    expect(duration("press")).toBe(90);
  });
});
