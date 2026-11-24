import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import EditorToasts from "@/components/editor/EditorToasts";
import {
  setDraftStorageError,
  setExportError,
  setImportError,
  setImportFeedback,
  setOtherTabActive,
} from "@/store/resume";

afterEach(() => {
  setExportError("");
  setImportError("");
  setImportFeedback(null);
  setDraftStorageError("");
  setOtherTabActive(null);
  vi.useRealTimers();
});

describe("EditorToasts", () => {
  it("shows an export error toast and dismisses it after five seconds", async () => {
    vi.useFakeTimers();
    const { queryByRole } = render(() => <EditorToasts />);

    setExportError("Add your name before exporting.");

    expect(queryByRole("alert")?.textContent).toContain("Add your name before exporting.");

    vi.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(queryByRole("alert")).toBeNull();
  });

  it("dismisses an import error toast through its button", () => {
    const { getByRole, getByLabelText, queryByRole } = render(() => <EditorToasts />);

    setImportError("Unsupported JSON Resume fields: nope.");
    expect(getByRole("alert").textContent).toContain("Unsupported JSON Resume fields");

    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByRole("alert")).toBeNull();
  });

  it("keeps the draft storage error on screen until it is dismissed", async () => {
    vi.useFakeTimers();
    const { getByRole, getByLabelText, queryByRole } = render(() => <EditorToasts />);

    setDraftStorageError("Couldn't save your changes in this browser. Export JSON to keep a copy.");
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(getByRole("alert").textContent).toContain("Export JSON to keep a copy.");

    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByRole("alert")).toBeNull();
  });

  it("lists ignored JSON fields in a short notice", () => {
    const { getByRole } = render(() => <EditorToasts />);

    setImportFeedback({ ignoredFields: ["meta", "custom"] });

    expect(getByRole("status").textContent).toBe(
      "Tailory doesn't use these fields, so they weren't imported: meta, custom."
    );
  });

  it("says what a PDF or DOCX import found", () => {
    const { getByRole } = render(() => <EditorToasts />);

    setImportFeedback({
      confidence: 90,
      work: 2,
      education: 1,
      skills: 0,
      projects: 0,
      certificates: 0,
    });

    expect(getByRole("status").textContent).toBe("Imported. Found 2 jobs, 1 school.");
  });

  it("caps a long list of ignored fields", () => {
    const { getByRole } = render(() => <EditorToasts />);

    setImportFeedback({ ignoredFields: ["a", "b", "c", "d", "e", "f", "g"] });

    expect(getByRole("status").textContent).toContain("a, b, c, d, e, and 2 more.");
  });

  it("offers to use this tab when the editor is open in another tab", async () => {
    vi.useFakeTimers();
    const takeOver = vi.fn();
    const { getByRole, queryByLabelText } = render(() => <EditorToasts />);

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
