import { createSignal, flush } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { click, mount, press } from "../testing/dom";
import { Menu } from "./Menu";

function ViewMenu(props: { onExport?: () => void }) {
  const [archived, setArchived] = createSignal(false);
  return (
    <>
      <Menu
        trigger="View"
        active={archived()}
        items={[
          { kind: "checkbox", label: "Show archived", checked: archived(), onChange: setArchived },
          { kind: "separator" },
          { label: "Export", onSelect: () => props.onExport?.() },
          { label: "Sort by date", onSelect: () => {} },
        ]}
      />
      <button type="button" id="after">
        Next
      </button>
    </>
  );
}

const trigger = () => document.querySelector<HTMLButtonElement>(".menu-trigger") as HTMLElement;
const menu = () => document.querySelector<HTMLElement>('[role="menu"]') as HTMLElement;
const isOpen = () => menu().hasAttribute("data-popover-open");
const focused = () => document.activeElement?.textContent?.trim();

describe("Menu", () => {
  it("is a menu button", () => {
    mount(() => <ViewMenu />);
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-controls")).toBe(menu().id);
    expect([...menu().querySelectorAll("[data-menu-item]")].map((i) => i.role)).toEqual([
      "menuitemcheckbox",
      "menuitem",
      "menuitem",
    ]);
  });

  it("opens from the keyboard: Down on the first item, Up on the last", () => {
    mount(() => <ViewMenu />);
    trigger().focus();
    press("ArrowDown");
    expect(isOpen()).toBe(true);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(focused()).toBe("Show archived");

    press("Escape");
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());

    press("ArrowUp");
    expect(focused()).toBe("Sort by date");
  });

  it("moves with arrows (wrapping), Home, End and the first letter", () => {
    mount(() => <ViewMenu />);
    click(trigger());
    expect(focused()).toBe("Show archived");
    press("ArrowDown");
    expect(focused()).toBe("Export");
    press("ArrowDown");
    press("ArrowDown");
    expect(focused()).toBe("Show archived");
    press("ArrowUp");
    expect(focused()).toBe("Sort by date");
    press("Home");
    expect(focused()).toBe("Show archived");
    press("End");
    expect(focused()).toBe("Sort by date");
    press("e");
    expect(focused()).toBe("Export");
  });

  it("toggles a checkable item, closes, and marks the trigger", () => {
    mount(() => <ViewMenu />);
    click(trigger());
    const item = menu().querySelector('[role="menuitemcheckbox"]') as HTMLElement;
    expect(item.getAttribute("aria-checked")).toBe("false");
    click(item);
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());
    const after = menu().querySelector('[role="menuitemcheckbox"]') as HTMLElement;
    expect(after.getAttribute("aria-checked")).toBe("true");
    expect(trigger().hasAttribute("data-active")).toBe(true);
  });

  it("runs an action and hands focus back to the trigger", () => {
    const onExport = vi.fn();
    mount(() => <ViewMenu onExport={onExport} />);
    click(trigger());
    press("ArrowDown");
    click(document.activeElement);
    expect(onExport).toHaveBeenCalledOnce();
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on Tab, from the trigger so Tab carries on", () => {
    mount(() => <ViewMenu />);
    click(trigger());
    const event = press("Tab");
    expect(event.defaultPrevented).toBe(false);
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("follows the browser when it light-dismisses", () => {
    mount(() => <ViewMenu />);
    click(trigger());
    menu().hidePopover();
    flush();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
