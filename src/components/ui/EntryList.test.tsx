import { fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmHost } from "@/components/ui/confirm";
import { EntryList } from "@/components/ui/EntryList";
import { createDocument } from "@/lib/versions/document";
import { createVersion, loadDocument, versions } from "@/store/document";
import { setActiveVersionId } from "@/store/editor";
import { EMPTY_RESUME } from "@/types/resume";

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
    <>
      <ConfirmHost />
      <EntryList
        items={items}
        title={(item) => item.name}
        onReorder={onReorder}
        onRemove={onRemove}
        onAdd={onAdd}
        addLabel="Add entry"
        renderItem={(item) => <span>{item.name} fields</span>}
      />
    </>
  ));

  return { ...utils, onReorder, onRemove, onAdd };
}

afterEach(() => {
  setActiveVersionId(null);
  loadDocument(createDocument(EMPTY_RESUME));
});

describe("EntryList on the master", () => {
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

  it("removes an item by id after confirming, and can add a new one", async () => {
    const { getByRole, onRemove, onAdd } = renderList();

    fireEvent.click(getByRole("button", { name: "Remove Beta" }));
    expect(screen.getByRole("dialog", { name: "Delete “Beta”?" })).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await Promise.resolve();
    expect(onRemove).toHaveBeenCalledWith("b");

    fireEvent.click(getByRole("button", { name: "Add entry" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe("EntryList in a version", () => {
  function openVersion() {
    loadDocument(
      createDocument({
        ...structuredClone(EMPTY_RESUME),
        skills: items.map((item) => ({ id: item.id, name: item.name })),
      })
    );
    const id = createVersion({ name: "Acme" });
    setActiveVersionId(id);
    return id;
  }

  it("swaps move and remove for a tickbox per entry", () => {
    openVersion();
    const { getByRole, queryAllByLabelText } = renderList();

    expect(queryAllByLabelText(/^Remove/)).toHaveLength(0);
    expect(queryAllByLabelText("Move up")).toHaveLength(0);
    expect(getByRole("checkbox", { name: "Beta" })).toBeChecked();
  });

  it("folds a left-out entry to its struck-through title", () => {
    openVersion();
    const { getByRole, getByText, queryByText } = renderList();

    fireEvent.click(getByRole("checkbox", { name: "Beta" }));

    expect(versions[0]?.excluded).toEqual(["b"]);
    expect(getByRole("checkbox", { name: "Beta" })).not.toBeChecked();
    expect(getByText("Beta")).toHaveClass("line-through");
    expect(queryByText("Beta fields")).toBeNull();
    expect(queryByText("Alpha fields")).toBeNull();
  });

  it("keeps an entry's fields behind Details", () => {
    openVersion();
    const { getByRole, getByText, queryByText } = renderList();
    const details = getByRole("button", { name: "Details for Alpha" });

    expect(details).toHaveAttribute("aria-expanded", "false");
    expect(queryByText("Alpha fields")).toBeNull();

    fireEvent.click(details);

    expect(details).toHaveAttribute("aria-expanded", "true");
    expect(getByText("Alpha fields")).toBeInTheDocument();
  });
});
