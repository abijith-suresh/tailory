import { fireEvent, render, screen } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it } from "vitest";

import VolunteerForm from "@/components/editor/VolunteerForm";
import { ConfirmHost } from "@/components/ui/confirm";
import { exportJsonResumeDocument } from "@/lib/resume/json";
import { resume, setResume } from "@/store/resume";

beforeEach(() => {
  setResume("volunteer", []);
});

describe("VolunteerForm", () => {
  it("adds an entry and writes each field under its JSON Resume name", () => {
    const { getByRole, getByLabelText } = render(() => <VolunteerForm />);

    fireEvent.click(getByRole("button", { name: "Add volunteer role" }));
    expect(resume.volunteer).toHaveLength(1);

    fireEvent.input(getByLabelText("Organization"), { target: { value: "Code Club" } });
    fireEvent.input(getByLabelText("Role"), { target: { value: "Mentor" } });
    fireEvent.input(getByLabelText("Start date"), { target: { value: "Mar 2022" } });
    fireEvent.input(getByLabelText("End date"), { target: { value: "Present" } });
    fireEvent.input(getByLabelText("URL (optional)"), {
      target: { value: "https://codeclub.org" },
    });
    fireEvent.input(getByLabelText("Summary"), { target: { value: "Weekly sessions." } });
    fireEvent.click(getByRole("button", { name: "Add bullet" }));
    fireEvent.input(getByLabelText("Highlight 1"), {
      target: { value: "Taught Python to 30 students" },
    });

    expect(exportJsonResumeDocument(resume).volunteer).toEqual([
      {
        organization: "Code Club",
        position: "Mentor",
        url: "https://codeclub.org",
        startDate: "2022-03",
        summary: "Weekly sessions.",
        highlights: ["Taught Python to 30 students"],
      },
    ]);
  });

  it("reorders entries, and removes one after confirming", async () => {
    setResume("volunteer", [
      { id: "v1", organization: "Code Club", position: "Mentor" },
      { id: "v2", organization: "Food Bank", position: "Driver" },
    ]);
    const { getAllByLabelText } = render(() => (
      <>
        <VolunteerForm />
        <ConfirmHost />
      </>
    ));

    fireEvent.click(getAllByLabelText("Move down")[0] as HTMLElement);
    expect(resume.volunteer?.map((entry) => entry.id)).toEqual(["v2", "v1"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Driver, Food Bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await Promise.resolve();
    expect(resume.volunteer?.map((entry) => entry.id)).toEqual(["v1"]);
  });
});
