import type { ApplicationStatus } from "@tailory/core";
import { Loading, Show } from "solid-js";

import { fullTime, timeAgo } from "../../lib/applications";
import { agentText, type CardPage, COLUMNS } from "../../lib/board";
import type { ApplicationRow } from "../../server/pages";
import { Icon } from "../Icon";
import { Menu } from "../Menu";
import { BOARD_STATUS_LABELS, OfferTag, OutcomeTag } from "../StatusTag";
import { CardThumb } from "./CardThumb";
import { PageFit } from "./PageFit";

export type BoardCardProps = {
  row: ApplicationRow;
  /** The page result. Reading it may wait on the results loading. */
  page: () => CardPage | null | undefined;
  /** Where the thumbnail is drawn from: the row as the board loaded it. */
  version: string;
  /** Picked up with the keyboard. */
  lifted: boolean;
  /** Being dragged: the card is the gap the ghost lands in. */
  slot: boolean;
  /** The id of the text explaining how to move cards. */
  describedBy: string;
  onPointerDown: (event: PointerEvent) => void;
  onLinkKeyDown: (event: KeyboardEvent) => void;
  onLinkClick: (event: MouseEvent) => void;
  onOpen: () => void;
  onMove: (status: ApplicationStatus) => void;
  onArchive: (archived: boolean) => void;
};

export const cardLinkSelector = (id: string) => `[data-flip-key="${id}"] .board-card__link`;

/**
 * One application on the board: page one of its resume, the company and role, how it ended or
 * an offer, its page result, when it last moved, and the agent's changes waiting for review.
 * The company is the link to the application; the whole card takes the click.
 */
export function BoardCard(props: BoardCardProps) {
  const name = () => props.row.company || "No company";
  return (
    <li
      class={[
        "board-card",
        {
          "board-card--archived": props.row.archived,
          "board-card--lifted": props.lifted,
          "board-card--slot": props.slot,
        },
      ]}
      data-flip-key={props.row.id}
      onPointerDown={(event) => props.onPointerDown(event)}
    >
      <CardThumb id={props.row.id} version={props.version} />
      <div class="board-card__body">
        <h3 class="board-card__company">
          <a
            class="board-card__link"
            href={`/applications/${props.row.id}`}
            aria-describedby={props.describedBy}
            aria-roledescription={props.lifted ? "picked-up card" : undefined}
            draggable={false}
            onKeyDown={(event) => props.onLinkKeyDown(event)}
            onClick={(event) => props.onLinkClick(event)}
          >
            {name()}
          </a>
        </h3>
        <p class="board-card__role">{props.row.role}</p>
        <Show when={props.row.archived || props.row.offer || props.row.outcome}>
          <p class="board-card__tags">
            <Show when={props.row.status === "closed" && props.row.outcome}>
              {(outcome) => <OutcomeTag outcome={outcome()} />}
            </Show>
            <Show when={props.row.offer && props.row.status !== "closed"}>
              <OfferTag />
            </Show>
            <Show when={props.row.archived}>
              <span class="tag">Archived</span>
            </Show>
          </p>
        </Show>
        <p class="board-card__foot">
          <Loading fallback={<span class="page-fit page-fit--none">Fitting…</span>}>
            <PageFit page={props.page()} />
          </Loading>
          <time
            class="board-card__moved"
            datetime={props.row.statusChangedAt}
            title={`Last moved ${fullTime(props.row.statusChangedAt)}`}
          >
            <span class="visually-hidden">Moved </span>
            {timeAgo(props.row.statusChangedAt)}
          </time>
        </p>
      </div>
      <Show when={props.row.pending}>
        {(pending) => (
          <p class="board-card__agent">
            <span>{agentText(pending())}</span>
            <span class="visually-hidden"> · </span>
            <time datetime={pending().latestAt} title={fullTime(pending().latestAt)}>
              {timeAgo(pending().latestAt)}
            </time>
          </p>
        )}
      </Show>
      <Menu
        triggerClass="board-card__more"
        triggerLabel={`Actions for ${name()}`}
        trigger={<Icon name="more" />}
        align="end"
        items={[
          { label: "Open", onSelect: () => props.onOpen() },
          { kind: "separator" },
          { kind: "label", label: "Move to" },
          ...COLUMNS.map((status) => ({
            kind: "checkbox" as const,
            label: BOARD_STATUS_LABELS[status],
            checked: props.row.status === status,
            onChange: () => {
              if (props.row.status !== status) props.onMove(status);
            },
          })),
          { kind: "separator" },
          props.row.archived
            ? { label: "Unarchive", onSelect: () => props.onArchive(false) }
            : { label: "Archive", onSelect: () => props.onArchive(true) },
        ]}
      />
    </li>
  );
}
