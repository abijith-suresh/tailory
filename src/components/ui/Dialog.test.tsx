import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";

import Dialog from "./Dialog";

function Harness() {
  const [open, setOpen] = createSignal(false);
  return (
    <main>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog open={open()} title="Rename version" onClose={() => setOpen(false)}>
        <input aria-label="Name" />
        <button type="button">Save</button>
      </Dialog>
    </main>
  );
}

function openDialog() {
  render(() => <Harness />);
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, dialog: screen.getByRole("dialog", { name: "Rename version" }) };
}

describe("Dialog", () => {
  it("is modal, focuses its first field and makes the page behind it inert", () => {
    const { trigger, dialog } = openDialog();

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
    expect(trigger.closest("[inert]")).not.toBeNull();
  });

  it("keeps Tab inside", () => {
    const { dialog } = openDialog();
    const save = screen.getByRole("button", { name: "Save" });

    save.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(save);
  });

  it("closes on Escape and gives focus back to what opened it", () => {
    const { trigger, dialog } = openDialog();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.closest("[inert]")).toBeNull();
  });
});
