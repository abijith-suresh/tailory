import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { createMemo, createSignal, isPending, Loading, refresh, Show } from "solid-js";

import { Button, LinkButton } from "../components/Button";
import { ChangeList } from "../components/ChangeList";
import { Checkbox } from "../components/Checkbox";
import { EmptyState } from "../components/EmptyState";
import { Field, TextArea } from "../components/Field";
import { PageResult } from "../components/PageResult";
import { PdfPreview } from "../components/PdfPreview";
import { ResumeTree, type SaveEdit, SectionOrder } from "../components/ResumeEditor";
import { Select } from "../components/Select";
import { STATUS_LABELS, STATUSES, StatusBadge } from "../components/StatusBadge";
import {
  changeApplication,
  getApplicationScreen,
  getDownloadUrl,
  undoApplication,
} from "../server/functions";
import type { ApplicationView, ChangeView } from "../server/pages";

const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));

const PAGE_TARGET_OPTIONS = [
  { value: "", label: "No target" },
  ...[1, 2, 3, 4].map((pages) => ({
    value: String(pages),
    label: `${pages} ${pages === 1 ? "page" : "pages"}`,
  })),
];

export default function Application() {
  const params = useParams<{ id: string }>();
  const screen = createMemo(() => getApplicationScreen(params.id));

  return (
    <Loading fallback={<p class="muted">Loading the application…</p>}>
      <Show
        when={screen()}
        fallback={
          <>
            <Title>Not found · Tailory</Title>
            <div class="page-head">
              <h1 class="page-title">Application not found</h1>
            </div>
            <EmptyState
              title="This application isn't here"
              actions={
                <LinkButton variant="primary" href="/">
                  Go to applications
                </LinkButton>
              }
            >
              <p>It may have been deleted, or it belongs to another account.</p>
            </EmptyState>
          </>
        }
      >
        {(view) => (
          <ApplicationScreen
            view={view()}
            pending={isPending(() => screen())}
            reload={() => refresh(screen)}
          />
        )}
      </Show>
    </Loading>
  );
}

function ApplicationScreen(props: {
  view: ApplicationView;
  pending: boolean;
  reload: () => Promise<unknown>;
}) {
  const [error, setError] = createSignal("");
  const [undoError, setUndoError] = createSignal("");
  const [undoing, setUndoing] = createSignal<string | null>(null);
  const [announcement, setAnnouncement] = createSignal("");

  const app = () => props.view.application;
  const id = () => app().id;
  const name = () => [app().company, app().role].filter(Boolean).join(", ");

  /** Saves one edit, then reloads the screen so the preview and page result follow. */
  const save: SaveEdit = async (edit) => {
    setError("");
    const result = await changeApplication(id(), edit);
    if (!result.ok) {
      setError(result.error);
      await props.reload();
      return false;
    }
    await props.reload();
    return true;
  };

  const undo = async (change: ChangeView) => {
    setUndoError("");
    setUndoing(change.id);
    const result = await undoApplication(id(), change.id);
    setUndoing(null);
    if (!result.ok) {
      setUndoError(result.error);
      return;
    }
    await props.reload();
    setAnnouncement(`Undid: ${change.summary}`);
    // By id: refs taken during hydration can miss the element on the page.
    document.getElementById("changes-title")?.focus();
  };

  const download = async (format: "pdf" | "json") => {
    setError("");
    try {
      window.location.assign(await getDownloadUrl(id(), format));
    } catch {
      setError("Couldn't start the download. Try again.");
    }
  };

  /** Saves a text field when it changes and the value differs from what's stored. */
  const saveField =
    (field: "company" | "role" | "postingUrl" | "jobDescription" | "notes") =>
    (event: Event & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const value = event.currentTarget.value;
      if (value.trim() === (app()[field] ?? "").trim()) return;
      if ((field === "company" || field === "role") && !value.trim()) {
        setError(`The ${field} can't be empty.`);
        event.currentTarget.value = app()[field];
        return;
      }
      void save({ type: "details", [field]: value });
    };

  return (
    <>
      <Title>{`${name() || "Application"} · Tailory`}</Title>
      <p class="back">
        <a class="link" href="/">
          Applications
        </a>
      </p>
      <div class="page-head">
        <div>
          <h1 class="page-title">{app().company || "No company"}</h1>
          <p class="page-lede app-lede">
            <span>{app().role}</span>
            <StatusBadge status={app().status} />
            <Show when={app().archived}>
              <span class="tag">Archived</span>
            </Show>
          </p>
        </div>
        <div class="page-head__actions">
          <Button variant="primary" disabled={!props.view.pdf} onClick={() => void download("pdf")}>
            Download PDF
          </Button>
          <Button onClick={() => void download("json")}>Download JSON</Button>
        </div>
      </div>
      <p class="form-error" role="alert">
        {error()}
      </p>

      <div class="app-layout">
        <section class="panel app-layout__details" aria-labelledby="job-title">
          <h2 class="panel__title" id="job-title">
            Job
          </h2>
          <div class="stack app-form">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={app().status}
              onChange={(event) =>
                void save({
                  type: "status",
                  status: event.currentTarget.value as (typeof STATUSES)[number],
                })
              }
            />
            <div class="form-row">
              <Field label="Company" value={app().company} onChange={saveField("company")} />
              <Field label="Role" value={app().role} onChange={saveField("role")} />
            </div>
            <div class="field">
              <Field
                label="Job posting link"
                type="url"
                optional
                placeholder="https://"
                value={app().postingUrl ?? ""}
                onChange={saveField("postingUrl")}
              />
              <Show when={app().postingUrl}>
                {(url) => (
                  <a
                    class="link field__hint"
                    href={url()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open the posting
                  </a>
                )}
              </Show>
            </div>
            <details class="disclosure">
              <summary class="disclosure__summary">
                Job description
                <Show when={!app().jobDescription}>
                  <span class="field__optional"> (none)</span>
                </Show>
              </summary>
              <TextArea
                label="Job description"
                class="disclosure__body"
                rows={10}
                value={app().jobDescription ?? ""}
                onChange={saveField("jobDescription")}
              />
            </details>
            <TextArea
              label="Notes"
              rows={3}
              value={app().notes}
              hint="Only for you. They aren't printed."
              onChange={saveField("notes")}
            />
          </div>
          <div class="panel__actions">
            <Button onClick={() => void save({ type: "archive", archived: !app().archived })}>
              {app().archived ? "Unarchive" : "Archive"}
            </Button>
          </div>
        </section>

        <section class="app-layout__preview" aria-labelledby="preview-title">
          <div class="preview-head">
            <h2 class="panel__title" id="preview-title">
              Resume
            </h2>
            <p class="preview-head__result" aria-live="polite" aria-atomic="true">
              <PageResult result={props.view.page} />
              <Show when={props.pending}>
                <span class="visually-hidden"> (updating)</span>
              </Show>
            </p>
          </div>
          <Show when={props.view.staleCount > 0}>
            <p class="notice">
              {props.view.staleCount === 1
                ? "1 reworded line is"
                : `${props.view.staleCount} reworded lines are`}{" "}
              based on profile text that has changed since.
            </p>
          </Show>
          <Show
            when={props.view.pdf}
            fallback={
              <EmptyState
                title="Nothing to print yet"
                level={3}
                actions={<LinkButton href="/profile">Go to your profile</LinkButton>}
              >
                <p>
                  {props.view.profileEmpty
                    ? "Your profile is empty. Add your career history, or ask your agent to, and it shows here."
                    : (props.view.printError ?? "This application leaves everything out.")}
                </p>
              </EmptyState>
            }
          >
            {(pdf) => (
              <PdfPreview
                pdf={pdf()}
                stale={props.pending}
                label={`Resume for ${name()}, as it will print`}
              />
            )}
          </Show>
        </section>

        <section class="panel app-layout__changes" aria-labelledby="changes-title">
          <h2 class="panel__title" id="changes-title" tabindex="-1">
            Recent changes
          </h2>
          <p class="visually-hidden" role="status">
            {announcement()}
          </p>
          <p class="form-error" role="alert">
            {undoError()}
          </p>
          <ChangeList
            changes={props.view.changes}
            undoing={undoing()}
            onUndo={(change) => void undo(change)}
          />
        </section>

        <section class="panel app-layout__edit" aria-labelledby="edit-title">
          <h2 class="panel__title" id="edit-title">
            Tailor the resume
          </h2>
          <p class="panel__text">Every change saves at once and shows in the preview.</p>
          <div class="stack app-form">
            <div class="form-row">
              <Select
                label="Template"
                options={props.view.templates.map((template) => ({
                  value: template.id,
                  label: template.label,
                }))}
                value={app().templateId}
                onChange={(event) =>
                  void save({
                    type: "template",
                    templateId: event.currentTarget
                      .value as ApplicationView["application"]["templateId"],
                  })
                }
              />
              <Select
                label="Page target"
                options={PAGE_TARGET_OPTIONS}
                value={app().pageTarget === null ? "" : String(app().pageTarget)}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  void save({ type: "fit", pageTarget: value ? Number(value) : null });
                }}
              />
            </div>
            <Checkbox
              label="Tighten spacing to fit the page target"
              checked={app().autoFit}
              disabled={app().pageTarget === null}
              onChange={(event) => void save({ type: "fit", autoFit: event.currentTarget.checked })}
            />
            <Show when={props.view.order.length > 1}>
              <div class="field">
                <h3 class="field__label" id="order-title">
                  Section order
                </h3>
                <SectionOrder order={props.view.order} onSave={save} />
              </div>
            </Show>
            <div class="field">
              <h3 class="field__label">What to keep</h3>
              <p class="field__hint">
                Untick what this job doesn't need. Rewording a line changes it here only, not in
                your profile.
              </p>
              <Show
                when={props.view.sections.length > 0}
                fallback={<p class="panel__text">Your profile has nothing to choose from yet.</p>}
              >
                <ResumeTree sections={props.view.sections} onSave={save} />
              </Show>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
