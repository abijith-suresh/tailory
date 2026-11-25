import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import HighlightList from "@/components/ui/HighlightList";

function renderList(overrides: Partial<Parameters<typeof HighlightList>[0]> = {}) {
  const props = {
    highlights: ["First bullet", "Second bullet"],
    idPrefix: "work-highlight-1",
    label: "Highlights / Bullets",
    addLabel: "Add bullet",
    placeholder: "Led development of…",
    onInput: vi.fn(),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };

  return { ...render(() => <HighlightList {...props} />), props };
}

describe("HighlightList", () => {
  it("renders one textarea per highlight with the label and placeholder", () => {
    const { getAllByRole, getByText } = renderList();

    const textareas = getAllByRole("textbox") as HTMLTextAreaElement[];

    expect(textareas).toHaveLength(2);
    expect(textareas.map((textarea) => textarea.value)).toEqual(["First bullet", "Second bullet"]);
    expect(getByText("Highlights / Bullets")).toBeInTheDocument();
    expect(textareas[0]?.placeholder).toBe("Led development of…");
  });

  it("associates each textarea with the list label", () => {
    const { getAllByRole } = renderList();

    const textarea = (getAllByRole("textbox") as HTMLTextAreaElement[])[0];
    const describedBy = textarea?.getAttribute("aria-describedby") ?? "";

    expect(textarea?.id).toBe("work-highlight-1-0");
    expect(describedBy).toBe("work-highlight-1-label");
    expect(document.getElementById(describedBy)?.textContent).toBe("Highlights / Bullets");
  });

  it("reports input and removal with their indexes", () => {
    const { getAllByRole, getAllByLabelText, props } = renderList();

    const textareas = getAllByRole("textbox") as HTMLTextAreaElement[];

    fireEvent.input(textareas[1] as HTMLTextAreaElement, { target: { value: "Updated" } });
    expect(props.onInput).toHaveBeenCalledWith(1, "Updated");

    fireEvent.click(getAllByLabelText("Remove highlight")[1] as HTMLElement);
    expect(props.onRemove).toHaveBeenCalledWith(1);
  });

  it("adds a highlight through the add button", () => {
    const { getByRole, props } = renderList();

    fireEvent.click(getByRole("button", { name: "+ Add bullet" }));

    expect(props.onAdd).toHaveBeenCalledTimes(1);
  });
});
