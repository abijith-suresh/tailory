import {
  APPLICATION_OUTCOMES,
  APPLICATION_STATUSES,
  type ApplicationOutcome,
  type ApplicationStatus,
} from "@tailory/core";

/**
 * Where an application stands, in the four-column model: drafting, applied, interviewing and
 * closed. A closed application has an outcome; a pending offer is an Offer tag on interviewing.
 */
export const BOARD_STATUSES = APPLICATION_STATUSES;
export type BoardStatus = ApplicationStatus;

export const OUTCOMES = APPLICATION_OUTCOMES;
export type Outcome = ApplicationOutcome;

export const BOARD_STATUS_LABELS: Record<BoardStatus, string> = {
  drafting: "Drafting",
  applied: "Applied",
  interviewing: "Interviewing",
  closed: "Closed",
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  accepted: "Accepted",
  declined: "Declined",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const OUTCOME_TONE: Record<Outcome, string> = {
  accepted: "pill pill--positive",
  declined: "pill",
  rejected: "pill pill--negative",
  withdrawn: "pill",
};

/** The status as a dot and its word. The word is always there, so colour never stands alone. */
export function StatusTag(props: { status: BoardStatus }) {
  return (
    <span class={`status-tag status-tag--${props.status}`}>
      {BOARD_STATUS_LABELS[props.status]}
    </span>
  );
}

/** How a closed application ended. */
export function OutcomeTag(props: { outcome: Outcome }) {
  return <span class={OUTCOME_TONE[props.outcome]}>{OUTCOME_LABELS[props.outcome]}</span>;
}

/** An offer not yet accepted or declined. */
export function OfferTag() {
  return <span class="pill pill--positive">Offer</span>;
}
