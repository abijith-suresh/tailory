import { fireEvent, render, screen } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";

import PublicationsForm from "@/components/editor/PublicationsForm";
import { ConfirmHost } from "@/components/ui/confirm";
import { exportJsonResumeDocument } from "@/lib/resume/json";
import { resume, setResume } from "@/store/resume";

beforeEach(() => {
  setResume("publications", []);
});

describe("PublicationsForm", () => {
  it("adds an entry and writes each field under its JSON Resume name", () => {
    const { getByRole, getByLabelText } = render(() => <PublicationsForm />);

    fireEvent.click(getByRole("button", { name: "Add publication" }));
    expect(resume.publications).toHaveLength(1);

    fireEvent.input(getByLabelText("Title"), {
      target: { value: "Resume Imports" },
    });
    fireEvent.input(getByLabelText("Publisher"), { target: { value: "Frontend Weekly" } });
    fireEvent.input(getByLabelText("Release date"), { target: { value: "Jun 2024" } });
    fireEvent.input(getByLabelText("URL (optional)"), {
      target: { value: "https://example.com/imports" },
    });
    fireEvent.input(getByLabelText("Summary"), { target: { value: "How parsing works." } });

    expect(exportJsonResumeDocument(resume).publications).toEqual([
      {
        name: "Resume Imports",
        publisher: "Frontend Weekly",
        releaseDate: "2024-06",
        url: "https://example.com/imports",
        summary: "How parsing works.",
      },
    ]);
  });

  it("reorders entries, and removes one after confirming", async () => {
    setResume("publications", [
      { id: "p1", name: "Resume Imports" },
      { id: "p2", name: "Local-first Editors" },
    ]);
    const { getAllByLabelText } = render(() => (
      <>
        <PublicationsForm />
        <ConfirmHost />
      </>
    ));

    fireEvent.click(getAllByLabelText("Move down")[0] as HTMLElement);
    expect(resume.publications?.map((entry) => entry.id)).toEqual(["p2", "p1"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Local-first Editors" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await Promise.resolve();
    expect(resume.publications?.map((entry) => entry.id)).toEqual(["p1"]);
  });
});
