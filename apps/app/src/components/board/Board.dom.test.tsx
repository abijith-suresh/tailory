import { flush } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearToasts, toasts } from "../../lib/toast";
import type { ApplicationRow } from "../../server/pages";
import { click, mount, press, type } from "../../testing/dom";

const server = vi.hoisted(() => ({
  changeApplication: vi.fn(),
  undoApplication: vi.fn(),
  getPageResults: vi.fn(),
  getCardPdf: vi.fn(),
  newApplication: vi.fn(),
}));

vi.mock("../../server/functions", () => server);
vi.mock("@solidjs/router", () => ({ useNavigate: () => vi.fn() }));

const { Board } = await import("./Board");

const day = 24 * 60 * 60 * 1000;
const row = (id: string, company: string, overrides: Partial<ApplicationRow> = {}) => ({
  id,
  company,
  role: "Frontend engineer",
  status: "drafting" as const,
  outcome: null,
  offer: false,
  archived: false,
  statusChangedAt: new Date(Date.now() - day).toISOString(),
  updatedAt: new Date(Date.now() - day).toISOString(),
  pending: null,
  ...overrides,
});

const ROWS: ApplicationRow[] = [
  row("orbital", "Orbital Maps"),
  row("lumen", "Lumen Health", { status: "applied" }),
  row("quarry", "Quarry Commerce", { status: "closed", outcome: "withdrawn", archived: true }),
];

const columnOf = (company: string) =>
  [...document.querySelectorAll<HTMLElement>(".board-card")]
    .find((card) => card.querySelector(".board-card__link")?.textContent === company)
    ?.closest<HTMLElement>("[data-column]")?.dataset.column;

const link = (company: string) =>
  [...document.querySelectorAll<HTMLElement>(".board-card__link")].find(
    (element) => element.textContent === company
  ) as HTMLElement;

const messages = () => toasts().filter((item) => !item.leaving);

/** Lets the optimistic move, the save and the slide settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
  }
};

describe("Board", () => {
  beforeEach(() => {
    server.getPageResults.mockResolvedValue({});
    server.getCardPdf.mockResolvedValue(null);
    server.changeApplication.mockResolvedValue({
      ok: true,
      value: { changeId: "change-1", statusChangedAt: new Date().toISOString(), updatedAt: "" },
    });
    server.undoApplication.mockResolvedValue({ ok: true, value: undefined });
  });

  afterEach(() => {
    clearToasts();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("moves a card with the keyboard, saves it, and offers Undo", async () => {
    mount(() => <Board rows={ROWS} />);
    link("Orbital Maps").focus();
    press(" ");
    expect(document.querySelector(".board-card--lifted")).not.toBeNull();
    press("ArrowRight");
    await settle();
    expect(columnOf("Orbital Maps")).toBe("applied");
    expect(document.activeElement?.textContent).toBe("Orbital Maps");
    press(" ");
    await settle();
    expect(server.changeApplication).toHaveBeenCalledWith("orbital", {
      type: "status",
      status: "applied",
    });
    expect(columnOf("Orbital Maps")).toBe("applied");
    expect(messages().map((item) => item.message)).toEqual(["Orbital Maps moved to Applied"]);

    messages()[0]?.action?.run();
    await settle();
    expect(server.undoApplication).toHaveBeenCalledWith("orbital", "change-1");
    expect(columnOf("Orbital Maps")).toBe("drafting");
  });

  it("puts a card back with Escape", async () => {
    mount(() => <Board rows={ROWS} />);
    link("Orbital Maps").focus();
    press(" ");
    press("ArrowRight");
    await settle();
    press("Escape");
    await settle();
    expect(columnOf("Orbital Maps")).toBe("drafting");
    expect(server.changeApplication).not.toHaveBeenCalled();
  });

  it("snaps the card back and says why when the save fails", async () => {
    server.changeApplication.mockResolvedValue({ ok: false, error: "Tailory didn't answer." });
    mount(() => <Board rows={ROWS} />);
    link("Lumen Health").focus();
    press(" ");
    press("ArrowRight");
    await settle();
    press("Enter");
    await settle();
    expect(columnOf("Lumen Health")).toBe("applied");
    const [error] = messages();
    expect(error?.tone).toBe("error");
    expect(error?.message).toBe("Couldn't move Lumen Health. Tailory didn't answer.");
    expect(error?.action?.label).toBe("Try again");
  });

  it("asks how it ended before closing, and cancelling leaves it where it was", async () => {
    mount(() => <Board rows={ROWS} />);
    link("Lumen Health").focus();
    press(" ");
    press("ArrowRight");
    press("ArrowRight");
    await settle();
    press(" ");
    await settle();
    const dialog = [...document.querySelectorAll("dialog")].find(
      (element) => element.querySelector(".dialog__title")?.textContent === "How did it end?"
    );
    expect(dialog?.hasAttribute("open")).toBe(true);
    expect(server.changeApplication).not.toHaveBeenCalled();

    const cancel = [...(dialog?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Cancel"
    );
    click(cancel);
    await settle();
    expect(columnOf("Lumen Health")).toBe("applied");

    link("Lumen Health").focus();
    press(" ");
    press("ArrowRight");
    press("ArrowRight");
    await settle();
    press(" ");
    await settle();
    const rejected = [...document.querySelectorAll("dialog button")].find(
      (button) => button.textContent === "Rejected"
    );
    click(rejected);
    await settle();
    expect(server.changeApplication).toHaveBeenCalledWith("lumen", {
      type: "status",
      status: "closed",
      outcome: "rejected",
    });
    expect(columnOf("Lumen Health")).toBe("closed");
    expect(document.querySelector('[data-column="closed"] .board-card__tags')?.textContent).toBe(
      "Rejected"
    );
  });

  it("searches with /, and shows archived cards from View", async () => {
    mount(() => <Board rows={ROWS} />);
    const search = document.querySelector<HTMLInputElement>('input[type="search"]');
    press("/", {}, document.body);
    expect(document.activeElement).toBe(search);
    type(search as HTMLInputElement, "lumen");
    await settle();
    expect(document.querySelectorAll(".board-card")).toHaveLength(1);
    type(search as HTMLInputElement, "");
    await settle();
    expect(columnOf("Quarry Commerce")).toBeUndefined();

    const view = [...document.querySelectorAll<HTMLButtonElement>(".menu-trigger")].find(
      (button) => button.getAttribute("aria-label") === "View"
    );
    click(view);
    const archived = [...document.querySelectorAll('[role="menuitemcheckbox"]')].find((item) =>
      item.textContent?.startsWith("Show archived (1)")
    );
    click(archived);
    await settle();
    expect(columnOf("Quarry Commerce")).toBe("closed");
    expect(view?.hasAttribute("data-active")).toBe(true);
  });

  it("archives from the card's menu, with Undo", async () => {
    mount(() => <Board rows={ROWS} />);
    const more = document.querySelector<HTMLButtonElement>(
      '[aria-label="Actions for Orbital Maps"]'
    );
    click(more);
    const archive = [...document.querySelectorAll('[role="menuitem"]')].find(
      (item) => item.textContent === "Archive"
    );
    click(archive);
    await settle();
    expect(server.changeApplication).toHaveBeenCalledWith("orbital", {
      type: "archive",
      archived: true,
    });
    expect(columnOf("Orbital Maps")).toBeUndefined();
    expect(messages()[0]?.message).toBe("Orbital Maps archived");
    messages()[0]?.action?.run();
    await settle();
    expect(columnOf("Orbital Maps")).toBe("drafting");
  });
});
