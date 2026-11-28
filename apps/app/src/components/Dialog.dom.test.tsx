import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import { click, mount, press } from "../testing/dom";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field } from "./Field";

function Harness(props: { onClose?: () => void }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button id="opener" onClick={() => setOpen(true)}>
        Add role
      </Button>
      <Dialog
        open={open()}
        onClose={() => {
          setOpen(false);
          props.onClose?.();
        }}
        title="Add role"
        footer={
          <>
            <Button id="cancel" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button id="save" variant="primary">
              Add role
            </Button>
          </>
        }
      >
        <Field id="role" label="Role" />
        <Field id="company" label="Company" />
      </Dialog>
    </>
  );
}

const open = () => {
  const opener = document.getElementById("opener") as HTMLButtonElement;
  opener.focus();
  click(opener);
  return document.querySelector("dialog") as HTMLDialogElement;
};

describe("Dialog", () => {
  it("opens on the first field, not the close button", () => {
    mount(() => <Harness />);
    const dialog = open();
    expect(dialog.open).toBe(true);
    expect(document.activeElement?.id).toBe("role");
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id);
  });

  it("keeps Tab inside: past the last control it wraps to the first, and back", () => {
    mount(() => <Harness />);
    const dialog = open();
    const close = dialog.querySelector(".dialog__close") as HTMLElement;
    const save = document.getElementById("save") as HTMLElement;

    save.focus();
    const forward = press("Tab");
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);

    const back = press("Tab", { shiftKey: true });
    expect(back.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(save);

    // In the middle, Tab is the browser's to move.
    (document.getElementById("role") as HTMLElement).focus();
    expect(press("Tab").defaultPrevented).toBe(false);
  });

  it("gives focus back to what opened it when it closes", () => {
    const onClose = vi.fn();
    mount(() => <Harness onClose={onClose} />);
    const dialog = open();
    click(dialog.querySelector(".dialog__close"));
    expect(dialog.open).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.activeElement?.id).toBe("opener");
  });

  it("closes and returns focus when the page closes it too", () => {
    const onClose = vi.fn();
    mount(() => <Harness onClose={onClose} />);
    const dialog = open();
    click(document.getElementById("cancel"));
    expect(dialog.open).toBe(false);
    // The page closed it, so it isn't told again.
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("opener");
  });
});
