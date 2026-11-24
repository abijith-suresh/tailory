import { fireEvent, render } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";

import PublicationsForm from "@/components/editor/PublicationsForm";
import { exportJsonResumeDocument } from "@/lib/resume/json";
import { resume, setResume } from "@/store/resume";

beforeEach(() => {
  setResume("publications", []);
});

describe("PublicationsForm", () => {
  it("adds an entry and writes each field under its JSON Resume name", () => {
    const { getByRole, getByLabelText } = render(() => <PublicationsForm />);

    fireEvent.click(getByRole("button", { name: "+ Add publication" }));
    expect(resume.publications).toHaveLength(1);

    fireEvent.input(getByLabelText("Publication Title"), {
      target: { value: "Resume Imports" },
    });
    fireEvent.input(getByLabelText("Publisher"), { target: { value: "Frontend Weekly" } });
    fireEvent.input(getByLabelText("Release Date"), { target: { value: "Jun 2024" } });
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

  it("reorders and removes entries", () => {
    setResume("publications", [
      { id: "p1", name: "Resume Imports" },
      { id: "p2", name: "Local-first Editors" },
    ]);
    const { getAllByLabelText } = render(() => <PublicationsForm />);

    fireEvent.click(getAllByLabelText("Move down")[0] as HTMLElement);
    expect(resume.publications?.map((entry) => entry.id)).toEqual(["p2", "p1"]);

    fireEvent.click(getAllByLabelText("Remove")[0] as HTMLElement);
    expect(resume.publications?.map((entry) => entry.id)).toEqual(["p1"]);
  });
});
