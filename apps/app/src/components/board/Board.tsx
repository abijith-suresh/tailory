import { useNavigate } from "@solidjs/router";
import {
  APPLICATION_OUTCOMES,
  type ApplicationOutcome,
  type ApplicationStatus,
} from "@tailory/core";
import {
  createMemo,
  createSignal,
  createUniqueId,
  For,
  flush,
  onCleanup,
  onSettled,
  Show,
} from "solid-js";

import { COLUMNS, columnsOf, moveTo, type Preview, type Standing } from "../../lib/board";
import { flip, play, prefersReducedMotion } from "../../lib/motion";
import { toast } from "../../lib/toast";
import { changeApplication, getPageResults, undoApplication } from "../../server/functions";
import type { ApplicationRow } from "../../server/pages";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { Menu } from "../Menu";
import { NewApplication } from "../NewApplication";
import { BOARD_STATUS_LABELS, OUTCOME_LABELS, StatusTag } from "../StatusTag";
import { BoardCard, cardLinkSelector } from "./BoardCard";

type Moved = Standing & Pick<ApplicationRow, "statusChangedAt">;

const OFFLINE = "Tailory didn't answer.";

/** The pointer drag in progress, outside Solid: it changes every frame. */
type Drag = {
  id: string;
  card: HTMLElement;
  ghost: HTMLElement;
  /** Where the pointer holds the card, from its top left corner. */
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  tilt: number;
  frame: number;
};

/**
 * The Applications board: four columns, drafting to closed. Cards move by dragging, by keyboard
 * (Space picks a card up, the arrows carry it, Space drops it), or from the card's menu. Every
 * move shows at once and saves in the background; a toast offers Undo, and a failed save puts
 * the card back and says so. Search and archive filter here, on the cards already loaded.
 */
export function Board(props: { rows: ApplicationRow[] }) {
  const navigate = useNavigate();
  const helpId = createUniqueId();
  const boardId = createUniqueId();
  const searchId = createUniqueId();

  // The cards as the page knows them. They follow the server's rows when the board reloads,
  // and move ahead of the server while a save is on its way.
  const [rows, setRows] = createSignal(() => props.rows);
  const [query, setQuery] = createSignal("");
  const [showArchived, setShowArchived] = createSignal(false);
  // A card on its way to a column: shown there while dragged, picked up or asking for an outcome.
  const [preview, setPreview] = createSignal<Preview | null>(null);
  const [lifted, setLifted] = createSignal<string | null>(null);
  const [dragging, setDragging] = createSignal<string | null>(null);
  const [closing, setClosing] = createSignal<{ id: string; refocus: boolean } | null>(null);
  const [announcement, setAnnouncement] = createSignal("");

  // Page results take a moment to fit, so the cards show first.
  const pages = createMemo(() => getPageResults(props.rows.map((row) => row.id)));
  const versions = createMemo(
    () => new Map(props.rows.map((row) => [row.id, row.updatedAt] as const))
  );

  const columns = createMemo(() =>
    columnsOf(rows(), { query: query(), showArchived: showArchived(), preview: preview() })
  );
  const archivedCount = () => rows().filter((row) => row.archived).length;
  const shownCount = () => COLUMNS.reduce((sum, status) => sum + columns()[status].length, 0);

  const rowOf = (id: string) => rows().find((row) => row.id === id);
  const nameOf = (id: string) => rowOf(id)?.company || "The application";

  const patch = (id: string, changes: Partial<ApplicationRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  const board = () => document.getElementById(boardId);

  /** Applies a change and slides the cards to their new places. */
  const animate = (change: () => void) => {
    const element = board();
    if (!element) {
      change();
      return Promise.resolve();
    }
    return flip(element, change, { deep: true });
  };

  const focusCard = (id: string) => {
    flush();
    document.querySelector<HTMLElement>(cardLinkSelector(id))?.focus();
  };

  // ── Saving ────────────────────────────────────────────────────────────────────────────────

  /**
   * Moves a card to `status` and saves it. Closing needs to know how it ended, so without an
   * outcome it asks first, holding the card in Closed meanwhile.
   */
  const move = async (
    id: string,
    status: ApplicationStatus,
    outcome: ApplicationOutcome | null = null,
    refocus = false
  ) => {
    const row = rowOf(id);
    if (!row) return;
    if (status === "closed" && !outcome && row.status !== "closed") {
      await animate(() => setPreview({ id, status }));
      setClosing({ id, refocus });
      return;
    }
    const before: Moved = {
      status: row.status,
      outcome: row.outcome,
      offer: row.offer,
      statusChangedAt: row.statusChangedAt,
    };
    const next = moveTo(row, status, outcome);
    if (next.status === row.status && next.outcome === row.outcome) {
      await animate(() => {
        setPreview(null);
        if (refocus) focusCard(id);
      });
      return;
    }
    const label =
      next.status === "closed" && next.outcome
        ? `Closed, ${OUTCOME_LABELS[next.outcome].toLowerCase()}`
        : BOARD_STATUS_LABELS[next.status];
    const name = row.company || "The application";
    await animate(() => {
      setPreview(null);
      patch(id, { ...next, statusChangedAt: new Date().toISOString() });
      if (refocus) focusCard(id);
    });

    const result = await changeApplication(id, {
      type: "status",
      status: next.status,
      ...(next.status === "closed" ? { outcome: next.outcome } : {}),
    }).catch(() => ({ ok: false as const, error: OFFLINE }));

    if (!result.ok) {
      // Loud: the card goes back where it was, and the toast says why.
      await animate(() => patch(id, before));
      toast(`Couldn't move ${name}. ${result.error}`, {
        tone: "error",
        action: { label: "Try again", run: () => void move(id, status, next.outcome) },
      });
      return;
    }
    patch(id, { statusChangedAt: result.value.statusChangedAt });
    const changeId = result.value.changeId;
    toast(`${name} moved to ${label}`, {
      action: changeId
        ? { label: "Undo", run: () => void undo(id, changeId, before, name) }
        : undefined,
    });
  };

  /** Undoes a move or an archive by its logged change, putting the card back first. */
  const undo = async (
    id: string,
    changeId: string,
    before: Partial<ApplicationRow>,
    name: string
  ) => {
    const row = rowOf(id);
    if (!row) return;
    const after = Object.fromEntries(
      Object.keys(before).map((key) => [key, row[key as keyof ApplicationRow]])
    ) as Partial<ApplicationRow>;
    await animate(() => patch(id, before));
    const result = await undoApplication(id, changeId).catch(() => ({
      ok: false as const,
      error: OFFLINE,
    }));
    if (!result.ok) {
      await animate(() => patch(id, after));
      toast(`Couldn't undo for ${name}. ${result.error}`, { tone: "error" });
    }
  };

  const setArchived = async (id: string, archived: boolean) => {
    const row = rowOf(id);
    if (!row) return;
    const name = row.company || "The application";
    await animate(() => patch(id, { archived }));
    const result = await changeApplication(id, { type: "archive", archived }).catch(() => ({
      ok: false as const,
      error: OFFLINE,
    }));
    if (!result.ok) {
      await animate(() => patch(id, { archived: !archived }));
      toast(`Couldn't ${archived ? "archive" : "unarchive"} ${name}. ${result.error}`, {
        tone: "error",
        action: { label: "Try again", run: () => void setArchived(id, archived) },
      });
      return;
    }
    const changeId = result.value.changeId;
    toast(archived ? `${name} archived` : `${name} unarchived`, {
      action: changeId
        ? { label: "Undo", run: () => void undo(id, changeId, { archived: !archived }, name) }
        : undefined,
    });
  };

  // ── The outcome question ──────────────────────────────────────────────────────────────────

  const chooseOutcome = (outcome: ApplicationOutcome) => {
    const asked = closing();
    if (!asked) return;
    setClosing(null);
    void move(asked.id, "closed", outcome, asked.refocus);
  };

  const cancelClosing = () => {
    const asked = closing();
    if (!asked) return;
    setClosing(null);
    void animate(() => {
      setPreview(null);
      if (asked.refocus) focusCard(asked.id);
    });
    setAnnouncement(`${nameOf(asked.id)} stays where it was.`);
  };

  // ── Keyboard: Space picks up, arrows carry, Space drops, Escape puts back ─────────────────

  const columnIndex = (status: ApplicationStatus) => COLUMNS.indexOf(status);

  const onLinkKeyDown = (id: string, event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const row = rowOf(id);
    if (!row) return;
    if (lifted() !== id) {
      if (event.key !== " " || lifted() || dragging()) return;
      event.preventDefault();
      setLifted(id);
      setPreview({ id, status: row.status });
      setAnnouncement(
        `Picked up ${nameOf(id)}, in ${BOARD_STATUS_LABELS[row.status]}. Left and right arrows move it, Space drops it, Escape puts it back.`
      );
      return;
    }
    const at = preview()?.status ?? row.status;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        const next = COLUMNS[columnIndex(at) + (event.key === "ArrowLeft" ? -1 : 1)];
        if (!next) return;
        void animate(() => {
          setPreview({ id, status: next });
          focusCard(id);
        });
        setAnnouncement(BOARD_STATUS_LABELS[next]);
        return;
      }
      case " ":
      case "Enter":
        event.preventDefault();
        setLifted(null);
        setAnnouncement("");
        void move(id, at, null, true);
        return;
      case "Escape":
      case "Tab":
        if (event.key === "Escape") event.preventDefault();
        setLifted(null);
        void animate(() => {
          setPreview(null);
          if (event.key === "Escape") focusCard(id);
        });
        setAnnouncement(`${nameOf(id)} put back in ${BOARD_STATUS_LABELS[row.status]}.`);
        return;
      case "ArrowUp":
      case "ArrowDown":
        // The order in a column is by when cards moved, so up and down have nowhere to go.
        event.preventDefault();
    }
  };

  // ── Pointer drag ──────────────────────────────────────────────────────────────────────────

  let drag: Drag | null = null;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let stopPress: (() => void) | undefined;
  // A drag ends in a click on the card's link; this swallows it.
  let swallowClick = false;

  const columnAt = (x: number, y: number) => {
    for (const element of document.elementsFromPoint(x, y)) {
      const column = element.closest<HTMLElement>("[data-column]");
      if (column) return column.dataset.column as ApplicationStatus;
    }
    return null;
  };

  const placeGhost = () => {
    if (!drag) return;
    drag.ghost.style.transform = `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px) rotate(${drag.tilt}deg) scale(${prefersReducedMotion() ? 1 : 1.03})`;
  };

  const autoScroll = () => {
    const element = board();
    if (!drag || !element) return;
    const box = element.getBoundingClientRect();
    const edge = 48;
    if (drag.x < box.left + edge) element.scrollLeft -= 12;
    else if (drag.x > box.right - edge) element.scrollLeft += 12;
    if (drag.y > window.innerHeight - edge) window.scrollBy(0, 12);
    else if (drag.y < edge + 56) window.scrollBy(0, -12);
    drag.frame = requestAnimationFrame(autoScroll);
  };

  const onDragMove = (event: PointerEvent) => {
    if (!drag) return;
    event.preventDefault();
    const dx = event.clientX - drag.x;
    drag.x = event.clientX;
    drag.y = event.clientY;
    // The card leans a little into the way it is going.
    if (!prefersReducedMotion()) drag.tilt = Math.max(-5, Math.min(5, drag.tilt * 0.7 + dx * 0.3));
    placeGhost();
    const status = columnAt(event.clientX, event.clientY);
    if (status && status !== preview()?.status) {
      const id = drag.id;
      void animate(() => setPreview({ id, status }));
    }
  };

  const stopDragListeners = () => {
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragEnd);
    window.removeEventListener("pointercancel", onDragCancel);
    window.removeEventListener("keydown", onDragKey);
    window.removeEventListener("touchmove", blockScroll);
  };

  const blockScroll = (event: TouchEvent) => {
    if (drag) event.preventDefault();
  };

  /** Lands the ghost on the card's place, then drops the ghost. */
  const land = async (current: Drag) => {
    const target = document.querySelector<HTMLElement>(`[data-flip-key="${current.id}"]`);
    if (target) {
      const box = target.getBoundingClientRect();
      await play(
        current.ghost,
        [
          { transform: current.ghost.style.transform },
          { transform: `translate(${box.left}px, ${box.top}px) rotate(0deg) scale(1)` },
        ],
        { duration: "move", easing: "spring" }
      );
    }
    current.ghost.remove();
    setDragging(null);
  };

  const finishDrag = (cancel: boolean) => {
    const current = drag;
    if (!current) return;
    drag = null;
    cancelAnimationFrame(current.frame);
    stopDragListeners();
    document.documentElement.classList.remove("board-dragging");
    swallowClick = true;
    setTimeout(() => {
      swallowClick = false;
    }, 0);
    const to = preview()?.status;
    if (cancel || !to) {
      void animate(() => setPreview(null)).then(() => land(current));
      return;
    }
    void land(current);
    void move(current.id, to);
  };

  const onDragEnd = () => finishDrag(false);
  const onDragCancel = () => finishDrag(true);
  const onDragKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      finishDrag(true);
    }
  };

  const beginDrag = (id: string, card: HTMLElement, x: number, y: number) => {
    const row = rowOf(id);
    if (!row || drag || lifted()) return;
    const box = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add("board-card--ghost");
    ghost.removeAttribute("data-flip-key");
    for (const element of ghost.querySelectorAll("[id]")) element.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.width = `${box.width}px`;
    ghost.style.height = `${box.height}px`;
    document.body.append(ghost);
    drag = {
      id,
      card,
      ghost,
      offsetX: x - box.left,
      offsetY: y - box.top,
      x,
      y,
      tilt: 0,
      frame: 0,
    };
    placeGhost();
    document.documentElement.classList.add("board-dragging");
    setDragging(id);
    setPreview({ id, status: row.status });
    window.addEventListener("pointermove", onDragMove, { passive: false });
    window.addEventListener("pointerup", onDragEnd);
    window.addEventListener("pointercancel", onDragCancel);
    window.addEventListener("keydown", onDragKey);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    drag.frame = requestAnimationFrame(autoScroll);
    navigator.vibrate?.(8);
  };

  /**
   * A mouse drags after moving a few pixels. A finger or pen holds still for a moment first,
   * so a swipe still scrolls the board.
   */
  const onPointerDown = (id: string, event: PointerEvent) => {
    const target = event.target as Element;
    if (event.button !== 0 || target.closest(".board-card__more") || lifted() || drag) return;
    const card = event.currentTarget as HTMLElement;
    const startX = event.clientX;
    const startY = event.clientY;
    const mouse = event.pointerType === "mouse";
    let lastX = startX;
    let lastY = startY;
    const onMove = (moveEvent: PointerEvent) => {
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
      const distance = Math.hypot(lastX - startX, lastY - startY);
      if (mouse && distance > 5) {
        stopPress?.();
        beginDrag(id, card, startX, startY);
        onDragMove(moveEvent);
      } else if (!mouse && distance > 10) {
        stopPress?.();
      }
    };
    const stop = () => {
      clearTimeout(pressTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      stopPress = undefined;
    };
    stopPress = stop;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    if (!mouse) {
      pressTimer = setTimeout(() => {
        stop();
        beginDrag(id, card, lastX, lastY);
      }, 300);
    }
  };

  // ── The page around the board ─────────────────────────────────────────────────────────────

  const search = (value: string) => {
    void animate(() => setQuery(value));
  };

  // Runs in the browser only. Created on both sides, so hydration keys match.
  onSettled(() => {
    // "/" goes to search from anywhere that isn't taking typing.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest("input, textarea, select, [contenteditable], dialog[open]")) return;
      event.preventDefault();
      document.getElementById(searchId)?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  onCleanup(() => {
    // The server renders the board too, with nothing to stop.
    if (typeof window === "undefined") return;
    stopPress?.();
    if (drag) {
      cancelAnimationFrame(drag.frame);
      drag.ghost.remove();
      drag = null;
    }
    stopDragListeners();
    document.documentElement.classList.remove("board-dragging");
  });

  const moving = () => Boolean(lifted() || dragging());

  return (
    <>
      <div class="board-head">
        <h1 class="page-title">Applications</h1>
        <search class="board-search">
          <label class="visually-hidden" for={searchId}>
            Search applications
          </label>
          <Icon name="search" class="board-search__icon" />
          <input
            id={searchId}
            class="input board-search__input"
            type="search"
            placeholder="Search"
            autocomplete="off"
            aria-keyshortcuts="/"
            value={query()}
            onInput={(event) => search(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query()) {
                event.preventDefault();
                search("");
              }
            }}
          />
          <span class="board-search__key" aria-hidden="true">
            /
          </span>
        </search>
        <Menu
          triggerClass="button button--quiet board-view"
          triggerLabel="View"
          active={showArchived()}
          align="end"
          trigger={
            <>
              <Icon name="filter" />
              <span class="board-head__label">View</span>
            </>
          }
          items={[
            {
              kind: "checkbox",
              label: `Show archived${archivedCount() > 0 ? ` (${archivedCount()})` : ""}`,
              checked: showArchived(),
              onChange: (checked) => void animate(() => setShowArchived(checked)),
            },
          ]}
        />
        <NewApplication />
      </div>
      <p class="visually-hidden" id={helpId}>
        To move it to another column, drag the card, or press Space to pick it up, the left and
        right arrows to carry it, and Space again to drop it.
      </p>
      <p class="visually-hidden" role="status" aria-live="assertive">
        {announcement()}
      </p>
      <Show when={shownCount() === 0 && !moving()}>
        <p class="board-none" role="status">
          {query().trim()
            ? `No application's company or role contains “${query().trim()}”.`
            : "Every application is archived. Show them from View."}
        </p>
      </Show>
      <div
        id={boardId}
        class={["board", { "board--moving": moving() }]}
        role="region"
        aria-label="Applications by status"
      >
        <For each={COLUMNS}>
          {(status) => (
            <section
              class={[
                "board-column",
                { "board-column--target": moving() && preview()?.status === status },
              ]}
              data-column={status}
              aria-labelledby={`${boardId}-${status}`}
            >
              <h2 class="board-column__head" id={`${boardId}-${status}`}>
                <StatusTag status={status} />
                <span class="board-column__count">
                  <span class="visually-hidden">, </span>
                  {columns()[status].length || ""}
                </span>
              </h2>
              <ul class="board-column__cards">
                <For each={columns()[status]} keyed={(row) => row.id}>
                  {(row) => (
                    <BoardCard
                      row={row()}
                      page={() => pages()[row().id]}
                      version={versions().get(row().id) ?? row().updatedAt}
                      lifted={lifted() === row().id}
                      slot={dragging() === row().id}
                      describedBy={helpId}
                      onPointerDown={(event) => onPointerDown(row().id, event)}
                      onLinkKeyDown={(event) => onLinkKeyDown(row().id, event)}
                      onLinkClick={(event) => {
                        if (swallowClick || lifted() === row().id) event.preventDefault();
                      }}
                      onOpen={() => navigate(`/applications/${row().id}`)}
                      onMove={(to) => void move(row().id, to)}
                      onArchive={(archived) => void setArchived(row().id, archived)}
                    />
                  )}
                </For>
              </ul>
              <Show when={moving() && columns()[status].length === 0}>
                <p class="board-column__drop" aria-hidden="true">
                  Drop here
                </p>
              </Show>
            </section>
          )}
        </For>
      </div>
      <Dialog
        open={closing() !== null}
        onClose={cancelClosing}
        title="How did it end?"
        size="small"
        dismissable
        footer={<Button onClick={cancelClosing}>Cancel</Button>}
      >
        <p class="board-outcome__lede">
          {closing() ? `${nameOf(closing()?.id ?? "")} moves to Closed.` : ""}
        </p>
        <div class="board-outcome">
          <For each={APPLICATION_OUTCOMES}>
            {(outcome) => (
              <Button class="board-outcome__choice" onClick={() => chooseOutcome(outcome)}>
                {OUTCOME_LABELS[outcome]}
              </Button>
            )}
          </For>
        </div>
      </Dialog>
    </>
  );
}
