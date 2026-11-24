import { fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { ConfirmHost } from "@/components/ui/confirm";
import { createDocument } from "@/lib/versions/document";
import { createVersion, loadDocument, versions } from "@/store/document";
import { activeVersion, setActiveVersionId, setVersionDialog } from "@/store/editor";
import { EMPTY_RESUME } from "@/types/resume";
import VersionTabs from "./VersionTabs";

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function renderTabs() {
  render(() => (
    <>
      <VersionTabs />
      <ConfirmHost />
    </>
  ));
}

afterEach(() => {
  setVersionDialog(null);
  setActiveVersionId(null);
  loadDocument(createDocument(EMPTY_RESUME));
});

describe("VersionTabs", () => {
  it("creates a version from the dialog and opens it", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    const dialog = screen.getByRole("dialog", { name: "New version" });
    fireEvent.input(screen.getByRole("textbox", { name: "Job title" }), {
      target: { value: "Backend engineer" },
    });
    fireEvent.input(screen.getByRole("textbox", { name: "Company" }), {
      target: { value: "Stripe" },
    });
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

    expect(versions).toEqual([
      expect.objectContaining({ name: "Stripe, Backend engineer", company: "Stripe" }),
    ]);
    expect(screen.getByRole("tab", { name: "Stripe, Backend engineer" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("asks for a name when the dialog is empty", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    fireEvent.submit(screen.getByRole("dialog").querySelector("form") as HTMLFormElement);

    expect(versions).toEqual([]);
    expect(screen.getByRole("alert")).toHaveTextContent("Add a company, a job title or a name.");
  });

  it("moves between tabs with the arrow keys, Home and End, and opens the one it lands on", () => {
    createVersion({ name: "Acme" });
    createVersion({ name: "Globex" });
    renderTabs();
    const tablist = screen.getByRole("tablist", { name: "Versions" });

    expect(screen.getByRole("tab", { name: "Master" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Acme" })).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(activeVersion()?.name).toBe("Acme");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Acme" }));

    fireEvent.keyDown(tablist, { key: "End" });
    expect(activeVersion()?.name).toBe("Globex");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(activeVersion()).toBeUndefined();

    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(activeVersion()?.name).toBe("Globex");
  });

  it("deletes the open version only after confirming", async () => {
    setActiveVersionId(createVersion({ name: "Acme" }));
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "Options for Acme" }));
    await flush();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await flush();
    expect(versions).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Options for Acme" }));
    await flush();
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Delete version" }));
    await flush();

    expect(versions).toEqual([]);
    expect(screen.getByRole("tab", { name: "Master" })).toHaveAttribute("aria-selected", "true");
  });

  it("duplicates and renames the open version", async () => {
    setActiveVersionId(createVersion({ name: "Acme" }));
    renderTabs();

    fireEvent.click(screen.getByRole("button", { name: "Options for Acme" }));
    await flush();
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(activeVersion()?.name).toBe("Acme (copy)");

    fireEvent.click(screen.getByRole("button", { name: "Options for Acme (copy)" }));
    await flush();
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));
    fireEvent.input(screen.getByRole("textbox", { name: "Name (optional)" }), {
      target: { value: "Acme, design" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form") as HTMLFormElement);

    expect(versions.map((version) => version.name)).toEqual(["Acme", "Acme, design"]);
  });
});
