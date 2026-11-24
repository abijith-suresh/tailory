import { describe, expect, it } from "vitest";

import { EMPTY_RESUME, type ResumeSchema } from "@/types/resume";
import { countKept, countSection } from "./counts";

function master(): ResumeSchema {
  return {
    ...structuredClone(EMPTY_RESUME),
    work: [
      {
        id: "w1",
        name: "Acme",
        position: "Engineer",
        highlights: [
          { id: "h1", text: "One" },
          { id: "h2", text: "Two" },
        ],
      },
      { id: "w2", name: "Beta", position: "Lead", highlights: [{ id: "h3", text: "Three" }] },
    ],
    skills: [{ id: "s1", name: "TypeScript" }],
  };
}

describe("countKept", () => {
  it("counts every entry and bullet when nothing is left out", () => {
    expect(countKept(master(), { excluded: [] })).toEqual({ kept: 6, total: 6 });
  });

  it("does not count the bullets of a left-out entry as kept", () => {
    expect(countKept(master(), { excluded: ["w2"] })).toEqual({ kept: 4, total: 6 });
  });

  it("counts a left-out bullet once", () => {
    expect(countKept(master(), { excluded: ["h1"] })).toEqual({ kept: 5, total: 6 });
  });
});

describe("countSection", () => {
  it("counts the entries of one section", () => {
    expect(countSection(master(), { excluded: ["w1"] }, "work")).toEqual({ kept: 1, total: 2 });
    expect(countSection(master(), undefined, "skills")).toEqual({ kept: 1, total: 1 });
    expect(countSection(master(), undefined, "awards")).toEqual({ kept: 0, total: 0 });
  });
});
