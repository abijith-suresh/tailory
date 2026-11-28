import { createSignal } from "solid-js";

import { newApplication } from "../server/functions";
import { Button } from "./Button";
import { Field, TextArea } from "./Field";

/**
 * "New application", for people who don't use an agent: a button that opens a dialog asking for
 * the job, then goes to the new application.
 */
export function NewApplication() {
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  let dialog: HTMLDialogElement | undefined;

  const open = () => {
    setError("");
    dialog?.showModal();
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setPending(true);
    setError("");
    const result = await newApplication({
      company: String(data.get("company") ?? ""),
      role: String(data.get("role") ?? ""),
      postingUrl: String(data.get("postingUrl") ?? "").trim(),
      jobDescription: String(data.get("jobDescription") ?? ""),
    });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    window.location.assign(`/applications/${result.value.id}`);
  };

  return (
    <>
      <Button variant="primary" onClick={open} aria-haspopup="dialog">
        New application
      </Button>
      <dialog
        ref={(element) => {
          dialog = element;
        }}
        class="dialog"
        aria-labelledby="new-application-title"
        closedby="any"
      >
        <form class="stack" onSubmit={(event) => void submit(event)}>
          <h2 class="panel__title" id="new-application-title">
            New application
          </h2>
          <p class="panel__text">
            It starts from your whole profile. Leave out and reword lines on the next page.
          </p>
          <Field name="company" label="Company" required autocomplete="off" autofocus />
          <Field name="role" label="Role" required autocomplete="off" />
          <Field
            name="postingUrl"
            label="Job posting link"
            type="url"
            optional
            placeholder="https://"
            autocomplete="off"
          />
          <TextArea name="jobDescription" label="Job description" optional rows={5} />
          <p class="form-error" role="alert">
            {error()}
          </p>
          <div class="panel__actions">
            <Button type="submit" variant="primary" disabled={pending()}>
              Create application
            </Button>
            <Button onClick={() => dialog?.close()}>Cancel</Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
