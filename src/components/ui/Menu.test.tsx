import { fireEvent, render, screen } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import Menu from "./Menu";

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function renderMenu() {
  const onPdf = vi.fn();
  const onJson = vi.fn();
  render(() => (
    <Menu
      label="Export"
      triggerClass=""
      items={[
        { label: "PDF", onSelect: onPdf },
        { label: "JSON", onSelect: onJson },
        { label: "Backup", disabled: true, onSelect: vi.fn() },
      ]}
    />
  ));
  return { trigger: screen.getByRole("button", { name: "Export" }), onPdf, onJson };
}

describe("Menu", () => {
  it("opens on click with focus on the first item, and moves with the arrow keys", async () => {
    const { trigger } = renderMenu();

    fireEvent.click(trigger);
    await flush();

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "PDF" }));

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "JSON" }));

    // The disabled item is skipped, so Down wraps to the top.
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "PDF" }));
  });

  it("runs an item and returns focus to the button", async () => {
    const { trigger, onJson } = renderMenu();

    fireEvent.click(trigger);
    await flush();
    fireEvent.click(screen.getByRole("menuitem", { name: "JSON" }));

    expect(onJson).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape without running anything", async () => {
    const { trigger, onPdf } = renderMenu();

    fireEvent.click(trigger);
    await flush();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onPdf).not.toHaveBeenCalled();
  });
});
