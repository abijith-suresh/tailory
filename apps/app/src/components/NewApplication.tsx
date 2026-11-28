import { createSignal } from "solid-js";

import { newApplication } from "../server/functions";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { Field, TextArea } from "./Field";
import { Icon } from "./Icon";

/**
 * "New application", for people who don't use an agent: a button that opens a dialog asking for
 * the job, then goes to the new application.
 */
export function NewApplication() {
  const [open, setOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const submit = async (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    const data = new FormData(event.currentTarget);
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
      <Button
        variant="primary"
        class="new-application"
        aria-label="New application"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Icon name="plus" />
        <span class="new-application__label">New application</span>
      </Button>
      <Dialog
        open={open()}
        onClose={() => setOpen(false)}
        title="New application"
        onSubmit={(event) => void submit(event)}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" busy={pending()}>
              Create application
            </Button>
          </>
        }
      >
        <div class="form-row">
          <Field name="company" label="Company" required autocomplete="off" />
          <Field name="role" label="Role" required autocomplete="off" />
        </div>
        <Field
          name="postingUrl"
          label="Posting link"
          type="url"
          optional
          placeholder="https://"
          autocomplete="off"
        />
        <TextArea name="jobDescription" label="Job description" optional rows={5} />
        <p class="form-error" role="alert">
          {error()}
        </p>
      </Dialog>
    </>
  );
}
