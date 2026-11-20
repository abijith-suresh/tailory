import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import EditorLayout from "@/components/editor/EditorLayout";
import {
  setDraftStorageError,
  setOtherTabActive,
  setExportError,
  setImportError,
  setImportFeedback,
} from "@/store/resume";

afterEach(() => {
  setExportError("");
  setImportError("");
  setImportFeedback(null);
  setDraftStorageError("");
  setOtherTabActive(null);
  vi.useRealTimers();
});

describe("EditorLayout toasts", () => {
  it("shows an export error toast and dismisses it after five seconds", async () => {
    vi.useFakeTimers();
    const { queryByRole } = render(() => <EditorLayout />);

    setExportError("Add your name before exporting.");

    expect(queryByRole("alert")?.textContent).toContain("Add your name before exporting.");

    vi.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(queryByRole("alert")).toBeNull();
  });

  it("dismisses an import error toast through its button", () => {
    const { getByRole, getByLabelText, queryByRole } = render(() => <EditorLayout />);

    setImportError("Unsupported JSON Resume fields: nope.");
    expect(getByRole("alert").textContent).toContain("Unsupported JSON Resume fields");

    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByRole("alert")).toBeNull();
  });

  it("keeps the draft storage error on screen until it is dismissed", async () => {
    vi.useFakeTimers();
    const { getByRole, getByLabelText, queryByRole } = render(() => <EditorLayout />);

    setDraftStorageError("Couldn't save your changes in this browser. Export JSON to keep a copy.");
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(getByRole("alert").textContent).toContain("Export JSON to keep a copy.");

    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByRole("alert")).toBeNull();
  });

  it("offers to use this tab when the editor is open in another tab", async () => {
    vi.useFakeTimers();
    const takeOver = vi.fn();
    const { getByRole, queryByLabelText } = render(() => <EditorLayout />);

    setOtherTabActive({ takeOver });
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(getByRole("alert").textContent).toContain(
      "Tailory is open in another tab. Changes here aren't saved."
    );
    expect(queryByLabelText("Dismiss")).toBeNull();

    fireEvent.click(getByRole("button", { name: "Use this tab" }));
    expect(takeOver).toHaveBeenCalledTimes(1);
  });
});
