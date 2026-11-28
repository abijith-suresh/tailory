import { describe, expect, it } from "vitest";

import type { ApplicationRow } from "../server/pages";
import { agentText, columnsOf, fitText, matchesSearch, moveTo } from "./board";

const day = 24 * 60 * 60 * 1000;
const row = (id: string, overrides: Partial<ApplicationRow> = {}): ApplicationRow => ({
  id,
  company: `Company ${id}`,
  role: "Engineer",
  status: "drafting",
  outcome: null,
  offer: false,
  archived: false,
  statusChangedAt: new Date(Date.now() - Number(id) * day).toISOString(),
  updatedAt: new Date().toISOString(),
  pending: null,
  ...overrides,
});

const ids = (rows: ApplicationRow[]) => rows.map((each) => each.id);

describe("the board's columns", () => {
  const rows = [
    row("3"),
    row("1"),
    row("2", { status: "applied", company: "Northwind" }),
    row("4", { status: "closed", outcome: "rejected", archived: true }),
  ];

  it("puts each card in its status, most recently moved first, archived hidden", () => {
    const columns = columnsOf(rows, { query: "", showArchived: false });
    expect(ids(columns.drafting)).toEqual(["1", "3"]);
    expect(ids(columns.applied)).toEqual(["2"]);
    expect(ids(columns.interviewing)).toEqual([]);
    expect(ids(columns.closed)).toEqual([]);
    expect(ids(columnsOf(rows, { query: "", showArchived: true }).closed)).toEqual(["4"]);
  });

  it("filters by company or role", () => {
    const columns = columnsOf(rows, { query: "north", showArchived: false });
    expect(ids([...columns.drafting, ...columns.applied])).toEqual(["2"]);
    expect(matchesSearch({ company: "Lumen", role: "Senior ENGINEER" }, " engineer ")).toBe(true);
    expect(matchesSearch({ company: "Lumen", role: "Designer" }, "engineer")).toBe(false);
  });

  it("shows a card being moved at the top of the column it is over, even if filtered out", () => {
    const columns = columnsOf(rows, {
      query: "zzz",
      showArchived: false,
      preview: { id: "3", status: "interviewing" },
    });
    expect(ids(columns.drafting)).toEqual([]);
    expect(ids(columns.interviewing)).toEqual(["3"]);
    const over = columnsOf(rows, {
      query: "",
      showArchived: false,
      preview: { id: "3", status: "applied" },
    });
    expect(ids(over.applied)).toEqual(["3", "2"]);
  });
});

describe("a move", () => {
  it("closes with an outcome and clears the offer; opening again clears the outcome", () => {
    const offer = { status: "interviewing" as const, outcome: null, offer: true };
    expect(moveTo(offer, "closed", "declined")).toEqual({
      status: "closed",
      outcome: "declined",
      offer: false,
    });
    expect(moveTo({ status: "closed", outcome: "rejected", offer: false }, "applied")).toEqual({
      status: "applied",
      outcome: null,
      offer: false,
    });
    expect(moveTo(offer, "applied")).toEqual({ status: "applied", outcome: null, offer: true });
  });
});

describe("a card's words", () => {
  const page = { pagesNeeded: 1, pageTarget: 1, fits: true, linesOver: 0, lastPageFill: 0.5 };

  it("says the page count, or how far over the target it runs", () => {
    expect(fitText(page)).toBe("1 page");
    expect(fitText({ ...page, pagesNeeded: 2, pageTarget: null })).toBe("2 pages");
    expect(fitText({ ...page, fits: false, pagesNeeded: 2, linesOver: 3 })).toBe(
      "3 lines over 1 page"
    );
    expect(fitText({ ...page, fits: false, pageTarget: 2, pagesNeeded: 3, linesOver: 1 })).toBe(
      "1 line over 2 pages"
    );
  });

  it("names the agent by its client name", () => {
    expect(agentText({ count: 5, client: "Claude" })).toBe("Claude changed 5");
    expect(agentText({ count: 1, client: null })).toBe("Your agent changed 1");
  });
});
