import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

import { ReorderableList } from "@/components/ui/ReorderableList";

const items = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

function renderList(overrides: { onAdd?: () => void } = {}) {
  const onReorder = vi.fn();
  const onRemove = vi.fn();
  const onAdd = overrides.onAdd ?? vi.fn();

  const utils = render(() => (
    <ReorderableList
      items={items}
      onReorder={onReorder}
      onRemove={onRemove}
      onAdd={onAdd}
      addLabel="Add entry"
      renderItem={(item) => <span>{item.name}</span>}
    />
  ));

  return { ...utils, onReorder, onRemove, onAdd };
}

describe("ReorderableList", () => {
  it("moves an item down by rebuilding the array", () => {
    const { getAllByLabelText, onReorder } = renderList();

    fireEvent.click(getAllByLabelText("Move down")[0] as HTMLElement);

    expect(onReorder).toHaveBeenCalledWith([items[1], items[0], items[2]]);
  });

  it("moves an item up by rebuilding the array", () => {
    const { getAllByLabelText, onReorder } = renderList();

    fireEvent.click(getAllByLabelText("Move up")[2] as HTMLElement);

    expect(onReorder).toHaveBeenCalledWith([items[0], items[2], items[1]]);
  });

  it("disables the controls that would move past the ends", () => {
    const { getAllByLabelText } = renderList();

    expect((getAllByLabelText("Move up")[0] as HTMLButtonElement).disabled).toBe(true);
    expect((getAllByLabelText("Move down")[2] as HTMLButtonElement).disabled).toBe(true);
  });

  it("removes an item by id and can add a new one", () => {
    const { getAllByLabelText, getByRole, onRemove, onAdd } = renderList();

    fireEvent.click(getAllByLabelText("Remove")[1] as HTMLElement);
    expect(onRemove).toHaveBeenCalledWith("b");

    fireEvent.click(getByRole("button", { name: "+ Add entry" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
