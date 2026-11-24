import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import EditorLayout from "@/components/editor/EditorLayout";
import { setExportError, setImportError, setImportFeedback } from "@/store/resume";

afterEach(() => {
  setExportError("");
  setImportError("");
  setImportFeedback(null);
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

  it("lists ignored JSON fields in a short notice", () => {
    const { getByRole } = render(() => <EditorLayout />);

    setImportFeedback({ ignoredFields: ["meta", "custom"] });

    expect(getByRole("status").textContent).toBe(
      "Tailory doesn't use these fields, so they weren't imported: meta, custom."
    );
  });

  it("caps a long list of ignored fields", () => {
    const { getByRole } = render(() => <EditorLayout />);

    setImportFeedback({ ignoredFields: ["a", "b", "c", "d", "e", "f", "g"] });

    expect(getByRole("status").textContent).toContain("a, b, c, d, e, and 2 more.");
  });
});
