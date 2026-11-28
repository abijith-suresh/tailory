import { EMPTY_RESUME, type ResumeSchema } from "@tailory/core";
import { describe, expect, it } from "vitest";

import { renderHtml } from "../render.testing";
import { ProfileForm } from "./ProfileForm";
import {
  blankEntry,
  entriesOf,
  entryDates,
  entryHeading,
  move,
  parseList,
  SECTIONS,
} from "./sections";

const profile: ResumeSchema = {
  ...structuredClone(EMPTY_RESUME),
  basics: { ...structuredClone(EMPTY_RESUME).basics, name: "Ada Lovelace" },
  work: [
    {
      id: "job",
      name: "Analytical Engine",
      position: "Programmer",
      startDate: "1842",
      endDate: "1843",
      highlights: [
        { id: "b1", text: "Wrote the first program" },
        { id: "b2", text: "Explained loops" },
      ],
    },
  ],
  skills: [{ id: "s", name: "Math", keywords: ["Analysis", "Notes"] }],
};

describe("ProfileForm", () => {
  const doc = renderHtml(() => <ProfileForm resume={profile} edit={() => {}} />);

  it("has a section, with an add button, for every part of the resume model", () => {
    const headings = [...doc.querySelectorAll("h2")].map((h) =>
      h.textContent?.replace(/\d+$/, "").trim()
    );
    expect(headings).toEqual(["Basics", ...SECTIONS.map((spec) => spec.title)]);
    for (const spec of SECTIONS) expect(doc.querySelector(`#add-${spec.key}`)).not.toBeNull();
  });

  it("shows each entry with its heading, dates, fields and bullets", () => {
    const entry = doc.querySelector("#section-work")?.closest("section");
    expect(entry?.querySelector(".entry__heading")?.textContent).toBe(
      "Programmer · Analytical Engine"
    );
    expect(entry?.querySelector(".entry__dates")?.textContent).toBe("1842 – 1843");
    const bullets = [...(entry?.querySelectorAll(".bullet textarea") ?? [])];
    expect(bullets.map((b) => (b as HTMLTextAreaElement).value || b.textContent)).toEqual([
      "Wrote the first program",
      "Explained loops",
    ]);
    expect(entry?.querySelector('[aria-label="Move bullet 1 up"]')?.hasAttribute("disabled")).toBe(
      true
    );
    expect(
      entry?.querySelector('[aria-label="Remove Programmer · Analytical Engine"]')
    ).not.toBeNull();
  });

  it("labels every input", () => {
    for (const input of doc.querySelectorAll("input, textarea")) {
      expect(doc.querySelector(`label[for="${input.id}"]`), input.outerHTML).not.toBeNull();
    }
  });
});

describe("the section helpers", () => {
  const work = SECTIONS.find((spec) => spec.key === "work");
  if (!work) throw new Error("no work section");

  it("makes blank entries with every field and bullets", () => {
    const entry = blankEntry(work, "new");
    expect(entry).toMatchObject({ id: "new", position: "", name: "", highlights: [] });
    expect(entryHeading(work, entry)).toBe("");
    expect(entryDates(work, { ...entry, startDate: "2020" })).toBe("2020");
  });

  it("moves items within bounds only", () => {
    const list = ["a", "b", "c"];
    move(list, 2, 0);
    expect(list).toEqual(["c", "a", "b"]);
    move(list, 0, -1);
    expect(list).toEqual(["c", "a", "b"]);
  });

  it("reads comma-separated lists and fills missing sections", () => {
    expect(parseList(" Go, , Rust ,SQL")).toEqual(["Go", "Rust", "SQL"]);
    const empty = { basics: { name: "" } } as ResumeSchema;
    expect(entriesOf(empty, "awards")).toEqual([]);
    expect(empty.awards).toEqual([]);
  });
});
