import { fireEvent, render, screen } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";

import AwardsForm from "@/components/editor/AwardsForm";
import { ConfirmHost } from "@/components/ui/confirm";
import { exportJsonResumeDocument } from "@/lib/resume/json";
import { resume, setResume } from "@/store/resume";

beforeEach(() => {
  setResume("awards", []);
});

describe("AwardsForm", () => {
  it("adds an entry and writes each field under its JSON Resume name", () => {
    const { getByRole, getByLabelText } = render(() => <AwardsForm />);

    fireEvent.click(getByRole("button", { name: "Add award" }));
    expect(resume.awards).toHaveLength(1);

    fireEvent.input(getByLabelText("Award"), { target: { value: "Builder Award" } });
    fireEvent.input(getByLabelText("Awarded by"), { target: { value: "Acme" } });
    fireEvent.input(getByLabelText("Date"), { target: { value: "2024" } });
    fireEvent.input(getByLabelText("Summary"), { target: { value: "Shipped the importer." } });

    expect(exportJsonResumeDocument(resume).awards).toEqual([
      { title: "Builder Award", awarder: "Acme", date: "2024", summary: "Shipped the importer." },
    ]);
  });

  it("reorders entries, and removes one after confirming", async () => {
    setResume("awards", [
      { id: "a1", title: "Builder Award" },
      { id: "a2", title: "Mentor of the Year" },
    ]);
    const { getAllByLabelText } = render(() => (
      <>
        <AwardsForm />
        <ConfirmHost />
      </>
    ));

    fireEvent.click(getAllByLabelText("Move up")[1] as HTMLElement);
    expect(resume.awards?.map((entry) => entry.id)).toEqual(["a2", "a1"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Builder Award" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await Promise.resolve();
    expect(resume.awards?.map((entry) => entry.id)).toEqual(["a2"]);
  });
});
