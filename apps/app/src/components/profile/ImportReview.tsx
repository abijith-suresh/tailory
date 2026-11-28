import { For, Show } from "solid-js";

import { describeFound, type ImportPreview } from "../../lib/import/import-file";
import { Button } from "../Button";

type ImportReviewProps = {
  preview: ImportPreview;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** What a file held, before it replaces the profile. */
export function ImportReview(props: ImportReviewProps) {
  const basics = () => props.preview.resume.basics;
  const found = () => describeFound(props.preview.resume);
  const fromText = () => props.preview.kind !== "json";
  const lowConfidence = () => fromText() && (props.preview.confidence ?? 0) < 50;
  const who = () =>
    [basics().name, basics().label, basics().email].filter((part) => part?.trim()).join(" · ");

  return (
    <section class="panel import-review" aria-labelledby="import-review-title">
      <h2 class="panel__title" id="import-review-title" tabindex="-1">
        Found in {props.preview.fileName}
      </h2>
      <Show when={who()}>
        <p class="import-review__who">{who()}</p>
      </Show>
      <Show
        when={found().length > 0}
        fallback={<p class="panel__text">No sections were found in this file.</p>}
      >
        <ul class="import-review__found">
          <For each={found()}>{(line) => <li>{line}</li>}</For>
        </ul>
      </Show>
      <Show when={fromText()}>
        <p class="import-review__note">
          Reading {props.preview.kind === "pdf" ? "a PDF" : "a DOCX file"} is best effort: lines can
          land in the wrong section, or get missed, especially with columns or tables.
          {lowConfidence() ? " This one was hard to read." : ""} Check each section after you
          import. A JSON Resume file comes in exactly.
        </p>
      </Show>
      <Show when={props.preview.ignoredFields.length > 0}>
        <p class="import-review__note">
          Left out, because Tailory doesn't keep them: {props.preview.ignoredFields.join(", ")}.
        </p>
      </Show>
      <p class="panel__text">
        This replaces your whole profile. You can undo it from Recent changes.
      </p>
      <div class="panel__actions">
        <Button variant="primary" disabled={props.pending} onClick={() => props.onConfirm()}>
          Replace my profile
        </Button>
        <Button disabled={props.pending} onClick={() => props.onCancel()}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
