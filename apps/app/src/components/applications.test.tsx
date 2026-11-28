import { describe, expect, it } from "vitest";
import type { CardPage } from "../lib/board";
import type { ApplicationRow, ChangeView, SectionView } from "../server/pages";
import { BoardCard } from "./board/BoardCard";
import { ChangeList } from "./ChangeList";
import { PageResult } from "./PageResult";
import { ResumeTree } from "./ResumeEditor";
import { renderHtml } from "./render.testing";

const row = (
  id: string,
  status: ApplicationRow["status"],
  overrides: Partial<ApplicationRow> = {}
): ApplicationRow => ({
  id,
  company: `Company ${id}`,
  role: "Engineer",
  status,
  outcome: status === "closed" ? "rejected" : null,
  offer: false,
  archived: false,
  statusChangedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pending: null,
  ...overrides,
});

const fits: CardPage = {
  pagesNeeded: 1,
  pageTarget: null,
  fits: true,
  linesOver: 0,
  lastPageFill: 0.6,
};

describe("BoardCard", () => {
  const card = (overrides: Partial<ApplicationRow>, page = fits) =>
    renderHtml(() => (
      <ul>
        <BoardCard
          row={row("a", "applied", overrides)}
          page={() => page}
          version="v1"
          lifted={false}
          slot={false}
          describedBy="help"
          onPointerDown={() => {}}
          onLinkKeyDown={() => {}}
          onLinkClick={() => {}}
          onOpen={() => {}}
          onMove={() => {}}
          onArchive={() => {}}
        />
      </ul>
    ));

  it("links the company to the application and shows the role, page fit and last move", () => {
    const doc = card({});
    const link = doc.querySelector(".board-card__link");
    expect(link?.getAttribute("href")).toBe("/applications/a");
    expect(link?.textContent).toBe("Company a");
    expect(link?.getAttribute("aria-describedby")).toBe("help");
    expect(doc.querySelector(".board-card__role")?.textContent).toBe("Engineer");
    expect(doc.querySelector(".page-fit")?.textContent).toBe("1 page");
    expect(doc.querySelector(".board-card__moved")?.textContent).toBe("Moved just now");
    expect(doc.querySelector(".board-card__agent")).toBeNull();
    expect(doc.querySelector(".board-card__tags")).toBeNull();
  });

  it("says how far over the page target it runs", () => {
    const doc = card({}, { ...fits, fits: false, pageTarget: 1, pagesNeeded: 2, linesOver: 3 });
    const fit = doc.querySelector(".page-fit");
    expect(fit?.textContent).toBe("3 lines over 1 page");
    expect(fit?.getAttribute("data-state")).toBe("over");
  });

  it("names the agent and how many changes wait for review", () => {
    const doc = card({
      pending: {
        count: 5,
        client: "Claude",
        latestAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      },
    });
    expect(doc.querySelector(".board-card__agent")?.textContent).toBe(
      "Claude changed 5 · 5 minutes ago"
    );
  });

  it("tags an outcome on closed cards, an open offer, and archived cards", () => {
    expect(
      card({ status: "closed", outcome: "rejected" }).querySelector(".board-card__tags")
        ?.textContent
    ).toBe("Rejected");
    expect(
      card({ status: "interviewing", offer: true }).querySelector(".board-card__tags")?.textContent
    ).toBe("Offer");
    expect(card({ archived: true }).querySelector(".board-card__tags")?.textContent).toBe(
      "Archived"
    );
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
