import { describe, expect, it } from "vitest";

import type { ApplicationRow, ChangeView, SectionView } from "../server/pages";
import { ApplicationList } from "./ApplicationList";
import { ChangeList } from "./ChangeList";
import { PageResult } from "./PageResult";
import { ResumeTree } from "./ResumeEditor";
import { renderHtml } from "./render.testing";

const row = (id: string, status: ApplicationRow["status"], archived = false): ApplicationRow => ({
  id,
  company: `Company ${id}`,
  role: "Engineer",
  status,
  outcome: status === "closed" ? "rejected" : null,
  offer: false,
  archived,
  statusChangedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pendingChanges: 0,
});

describe("ApplicationList", () => {
  it("groups rows by status, soonest-needed first, each linking to its page", () => {
    const doc = renderHtml(() => (
      <ApplicationList
        rows={[row("a", "drafting"), row("b", "interviewing"), row("c", "drafting", true)]}
        pages={{ a: { message: "1 page, fits", fits: true, pageTarget: 1 } }}
      />
    ));
    const groups = [...doc.querySelectorAll(".app-group")].map((group) => ({
      title: group.querySelector("h2")?.firstChild?.textContent,
      links: [...group.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    }));
    expect(groups).toEqual([
      { title: "Interviewing", links: ["/applications/b"] },
      { title: "Drafting", links: ["/applications/a", "/applications/c"] },
    ]);
    const rowA = doc.querySelector('a[href="/applications/a"]');
    expect(rowA?.textContent).toContain("1 page, fits");
    expect(doc.querySelector('a[href="/applications/c"]')?.textContent).toContain("Archived");
    expect(doc.querySelector('a[href="/applications/b"]')?.textContent).not.toContain("Archived");
  });

  it("holds a place for page results while they load", () => {
    const doc = renderHtml(() => <ApplicationList rows={[row("a", "applied")]} />);
    expect(doc.querySelector(".app-row__page")?.textContent).toBe("…");
  });
});

describe("PageResult", () => {
  it("marks a resume over its target in words and style", () => {
    const over = renderHtml(() => (
      <PageResult result={{ message: "about 3 lines over 1 page", fits: false, pageTarget: 1 }} />
    )).querySelector(".page-result");
    expect(over?.className).toContain("page-result--over");
    expect(over?.textContent).toBe("about 3 lines over 1 page");
    expect(renderHtml(() => <PageResult result={null} />).body.textContent).toBe(
      "Nothing to print"
    );
  });
});

describe("ChangeList", () => {
  const change = (id: string, overrides: Partial<ChangeView> = {}): ChangeView => ({
    id,
    who: "You",
    byAgent: false,
    summary: `Change ${id}`,
    undoable: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it("says who made each change and offers Undo, except on the one that created it", () => {
    const doc = renderHtml(() => (
      <ChangeList
        changes={[
          change("2", { who: "claude-code", byAgent: true }),
          change("1", { summary: "Created Acme", undoable: false }),
        ]}
        onUndo={() => {}}
      />
    ));
    const items = [...doc.querySelectorAll(".change")];
    expect(items.map((item) => item.querySelector(".change__who")?.textContent)).toEqual([
      "claude-code",
      "You",
    ]);
    expect(items[0]?.querySelector("button")?.getAttribute("aria-label")).toBe("Undo: Change 2");
    expect(items[1]?.querySelector("button")).toBeNull();
  });
});

describe("ResumeTree", () => {
  const sections: SectionView[] = [
    {
      id: "work",
      key: "work",
      label: "Experience",
      lines: [],
      entries: [
        {
          id: "w1",
          title: "Engineer, Acme",
          detail: "2020",
          included: true,
          lines: [],
          bullets: [
            {
              id: "b1",
              itemId: "b1",
              field: "text",
              text: "Shipped payments",
              profileText: "Shipped the thing",
              baseText: "Shipped it",
              stale: true,
              included: true,
            },
            {
              id: "b2",
              itemId: "b2",
              field: "text",
              text: "Wrote docs",
              profileText: "Wrote docs",
              baseText: null,
              stale: false,
              included: false,
            },
          ],
        },
      ],
    },
  ];

  it("shows what's kept as checkboxes, and flags rewordings the profile has moved past", () => {
    const doc = renderHtml(() => <ResumeTree sections={sections} onSave={async () => true} />);
    expect(doc.querySelector("legend")?.textContent).toBe("Experience");
    const boxes = [...doc.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(boxes.map((box) => box.checked)).toEqual([true, true, false]);
    expect(boxes[2]?.getAttribute("aria-label")).toBe("Keep: Wrote docs");

    const [stale, plain] = [...doc.querySelectorAll(".tree__bullet")];
    expect(stale?.textContent).toContain("Reworded");
    expect(stale?.textContent).toContain("Profile changed");
    expect(stale?.textContent).toContain("Your profile now says: Shipped the thing");
    expect(plain?.className).toContain("tree__bullet--out");
    expect(plain?.textContent).not.toContain("Reworded");
  });
});
