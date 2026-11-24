import { fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import WorkForm from "@/components/editor/WorkForm";
import HighlightList from "@/components/ui/HighlightList";
import { createDocument } from "@/lib/versions/document";
import { resolveVersion } from "@/lib/versions/resolve";
import { createVersion, currentDocument, loadDocument, versions } from "@/store/document";
import { setActiveVersionId } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import { EMPTY_RESUME } from "@/types/resume";

function renderList(overrides: Partial<Parameters<typeof HighlightList>[0]> = {}) {
  const props = {
    highlights: [
      { id: "h1", text: "First bullet" },
      { id: "h2", text: "Second bullet" },
    ],
    idPrefix: "work-highlight-1",
    label: "Highlights",
    addLabel: "Add bullet",
    placeholder: "Led development of…",
    onInput: vi.fn(),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    ...overrides,
  };

  return { ...render(() => <HighlightList {...props} />), props };
}

afterEach(() => {
  setActiveVersionId(null);
  loadDocument(createDocument(EMPTY_RESUME));
});

describe("HighlightList on the master", () => {
  it("renders one labelled textarea per highlight in a named group", () => {
    renderList();

    const textareas = screen.getAllByRole("textbox") as HTMLTextAreaElement[];

    expect(textareas.map((textarea) => textarea.value)).toEqual(["First bullet", "Second bullet"]);
    expect(screen.getByRole("textbox", { name: "Highlight 1" })).toHaveAttribute(
      "id",
      "work-highlight-1-0"
    );
    expect(screen.getByRole("group", { name: "Highlights" })).toBeInTheDocument();
    expect(textareas[0]?.placeholder).toBe("Led development of…");
  });

  it("reports input and removal with their indexes", () => {
    const { props } = renderList();

    fireEvent.input(screen.getByRole("textbox", { name: "Highlight 2" }), {
      target: { value: "Updated" },
    });
    expect(props.onInput).toHaveBeenCalledWith(1, "Updated");

    fireEvent.click(screen.getByLabelText("Remove highlight 2"));
    expect(props.onRemove).toHaveBeenCalledWith(1);
  });

  it("adds a highlight through the add button", () => {
    const { props } = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Add bullet" }));

    expect(props.onAdd).toHaveBeenCalledTimes(1);
  });
});

describe("Highlights in a version", () => {
  function openVersion() {
    loadDocument(
      createDocument({
        ...structuredClone(EMPTY_RESUME),
        work: [
          {
            id: "w1",
            name: "Acme",
            position: "Engineer",
            highlights: [
              { id: "h1", text: "Built the importer" },
              { id: "h2", text: "Ran the design review" },
            ],
          },
        ],
      })
    );
    const id = createVersion({ name: "Stripe" });
    setActiveVersionId(id);
    render(() => <WorkForm />);
    return id;
  }

  const shown = (id: string) => resolveVersion(currentDocument(), id).work?.[0]?.highlights;

  it("leaves out an unticked bullet and keeps it in the list, struck through", () => {
    const id = openVersion();

    fireEvent.click(screen.getByRole("checkbox", { name: "Keep highlight 2" }));

    expect(shown(id)?.map((h) => h.text)).toEqual(["Built the importer"]);
    expect(screen.getByText("Ran the design review")).toHaveClass("line-through");
    expect(screen.queryByLabelText("Remove highlight 1")).toBeNull();
    expect(resume.work?.[0]?.highlights).toHaveLength(2);
  });

  it("rewords a bullet for the version only, and can go back to the original", () => {
    const id = openVersion();

    fireEvent.input(screen.getByRole("textbox", { name: "Highlight 1" }), {
      target: { value: "Built the payments importer" },
    });

    expect(shown(id)?.[0]?.text).toBe("Built the payments importer");
    expect(resume.work?.[0]?.highlights?.[0]?.text).toBe("Built the importer");
    expect(screen.getByText("Reworded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Use original" }));

    expect(shown(id)?.[0]?.text).toBe("Built the importer");
    expect(screen.queryByText("Reworded")).toBeNull();
  });

  it("notes when the original changes after rewording, and can take the new one", () => {
    const id = openVersion();
    fireEvent.input(screen.getByRole("textbox", { name: "Highlight 1" }), {
      target: { value: "Built the payments importer" },
    });

    setResume("work", 0, "highlights", 0, "text", "Built the PDF importer");

    expect(screen.getByText(/Original changed/)).toHaveTextContent("“Built the PDF importer”");
    expect(screen.getByRole("textbox", { name: "Highlight 1" })).toHaveValue(
      "Built the payments importer"
    );

    fireEvent.click(screen.getByRole("button", { name: "Use new original" }));

    expect(shown(id)?.[0]?.text).toBe("Built the PDF importer");
  });

  it("keeps the rewording and clears the note with Keep mine", () => {
    const id = openVersion();
    fireEvent.input(screen.getByRole("textbox", { name: "Highlight 1" }), {
      target: { value: "Built the payments importer" },
    });
    setResume("work", 0, "highlights", 0, "text", "Built the PDF importer");

    fireEvent.click(screen.getByRole("button", { name: "Keep mine" }));

    expect(screen.queryByText(/Original changed/)).toBeNull();
    expect(shown(id)?.[0]?.text).toBe("Built the payments importer");
  });

  it("adds a new bullet to the master for this version only, with typed text", () => {
    const id = openVersion();
    const other = createVersion({ name: "Linear" });

    fireEvent.click(screen.getByRole("button", { name: "Add bullet" }));
    const field = screen.getByRole("textbox", { name: "Highlight 3" });
    fireEvent.input(field, { target: { value: "L" } });
    fireEvent.input(field, { target: { value: "Led onboarding" } });

    const added = resume.work?.[0]?.highlights?.[2];
    expect(added?.text).toBe("Led onboarding");
    expect(versions.find((v) => v.id === id)?.rewordings).toEqual([]);
    expect(shown(id)?.map((h) => h.text)).toContain("Led onboarding");
    expect(versions.find((v) => v.id === other)?.excluded).toEqual([added?.id]);
  });
});
