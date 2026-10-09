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
});
