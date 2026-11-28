// The board's logic, apart from the DOM: which cards show, in which column and order, what a
// move changes, and how a card words its page result.

import {
  APPLICATION_STATUSES,
  type ApplicationOutcome,
  type ApplicationStatus,
} from "@tailory/core";

import type { ApplicationRow } from "../server/pages";

/** The columns, left to right: the way an application moves. */
export const COLUMNS: readonly ApplicationStatus[] = APPLICATION_STATUSES;

/** Whether a card's company or role contains the search, case ignored. */
export const matchesSearch = (row: Pick<ApplicationRow, "company" | "role">, query: string) => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return `${row.company}\n${row.role}`.toLocaleLowerCase().includes(needle);
};

/** A card on its way somewhere: shown in `status` while it is dragged or picked up. */
export type Preview = { id: string; status: ApplicationStatus };

/**
 * The cards in each column: those that match the search, archived ones only when shown, most
 * recently moved first. A card being moved shows at the top of the column it is over, which is
 * where it lands, since it will be the most recently moved.
 */
export const columnsOf = (
  rows: readonly ApplicationRow[],
  view: { query: string; showArchived: boolean; preview?: Preview | null }
): Record<ApplicationStatus, ApplicationRow[]> => {
  const columns = Object.fromEntries(COLUMNS.map((status) => [status, []])) as unknown as Record<
    ApplicationStatus,
    ApplicationRow[]
  >;
  const sorted = [...rows].sort(
    (a, b) => Date.parse(b.statusChangedAt) - Date.parse(a.statusChangedAt)
  );
  let moving: ApplicationRow | undefined;
  for (const row of sorted) {
    if (view.preview?.id === row.id) {
      moving = row;
      continue;
    }
    if (row.archived && !view.showArchived) continue;
    if (!matchesSearch(row, view.query)) continue;
    columns[row.status].push(row);
  }
  if (moving && view.preview) columns[view.preview.status].unshift(moving);
  return columns;
};

/** Where a card stands: its status, outcome and offer flag. */
export type Standing = Pick<ApplicationRow, "status" | "outcome" | "offer">;

/**
 * Where a card stands after moving to `status`: closing needs an outcome and clears the offer;
 * opening again clears the outcome. Mirrors core's moveApplication, for the optimistic update.
 */
export const moveTo = (
  from: Standing,
  status: ApplicationStatus,
  outcome: ApplicationOutcome | null = null
): Standing =>
  status === "closed"
    ? { status, outcome: outcome ?? from.outcome, offer: false }
    : { status, outcome: null, offer: from.offer };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** What a card shows of its page result. */
export type CardPage = {
  pagesNeeded: number;
  pageTarget: number | null;
  fits: boolean;
  linesOver: number;
  lastPageFill: number;
};

/** "1 page", "2 pages", or "3 lines over 1 page". */
export const fitText = (page: CardPage) =>
  page.fits
    ? plural(page.pagesNeeded, "page")
    : `${plural(Math.max(1, page.linesOver), "line")} over ${plural(page.pageTarget ?? 1, "page")}`;

/** "Claude changed 5": who changed the card and how often, for the agent strip. */
export const agentText = (pending: { count: number; client: string | null }) =>
  `${pending.client?.trim() || "Your agent"} changed ${pending.count}`;
