import { Title } from "@solidjs/meta";
import { For } from "solid-js";

import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { Select } from "../components/Select";
import { STATUS_LABELS, STATUSES, StatusBadge } from "../components/StatusBadge";

// Every shared component in one place, for design review. Served by `npm run dev` only.
export default function Components() {
  const statusOptions = STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] }));
  return (
    <>
      <Title>Components · Tailory</Title>
      <div class="page-head">
        <h1 class="page-title">Components</h1>
      </div>
      <div class="stack">
        <section class="panel stack" aria-labelledby="c-buttons">
          <h2 class="panel__title" id="c-buttons">
            Buttons
          </h2>
          <div class="panel__actions">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>
        <section class="panel stack" aria-labelledby="c-status">
          <h2 class="panel__title" id="c-status">
            Status badges
          </h2>
          <div class="panel__actions">
            <For each={STATUSES}>{(status) => <StatusBadge status={status} />}</For>
          </div>
        </section>
        <section class="panel stack" aria-labelledby="c-fields">
          <h2 class="panel__title" id="c-fields">
            Fields
          </h2>
          <Field label="Company" placeholder="Stripe" />
          <Field label="Job posting" optional hint="The link to the job ad." type="url" />
          <Field label="Role" value="" error="Enter the role you're applying for." />
          <Select label="Status" options={statusOptions} value="interviewing" />
        </section>
        <EmptyState
          title="Empty state"
          actions={<Button variant="primary">Do the next thing</Button>}
        >
          <p>One or two lines on what will be here and how to get it.</p>
        </EmptyState>
      </div>
    </>
  );
}
