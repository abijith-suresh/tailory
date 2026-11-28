import { describe, expect, it } from "vitest";

import { click, mount, press } from "../testing/dom";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  it("moves with Left, Right, Home and End, and shows one panel", () => {
    mount(() => (
      <Tabs
        label="Client"
        tabs={["Claude Code", "Codex", "Cursor"].map((name) => ({
          id: name.toLowerCase().replace(" ", "-"),
          label: name,
          content: () => <p>{name} setup</p>,
        }))}
      />
    ));
    const tabs = () => [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    const selected = () => tabs().find((t) => t.getAttribute("aria-selected") === "true");
    const visible = () =>
      [...document.querySelectorAll('[role="tabpanel"]')].filter((p) => !(p as HTMLElement).hidden);

    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tabs()[0].focus();
    press("ArrowRight");
    expect(selected()?.textContent).toBe("Codex");
    expect(document.activeElement).toBe(selected());
    press("ArrowLeft");
    press("ArrowLeft");
    expect(selected()?.textContent).toBe("Cursor");
    press("Home");
    expect(selected()?.textContent).toBe("Claude Code");
    press("End");
    expect(selected()?.textContent).toBe("Cursor");
    expect(visible().map((p) => p.textContent)).toEqual(["Cursor setup"]);
    click(tabs()[1]);
    expect(visible()[0].getAttribute("aria-labelledby")).toBe(tabs()[1].id);
  });
});
