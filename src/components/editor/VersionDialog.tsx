import { createEffect, createSignal } from "solid-js";

import { outlineButton, primaryButton } from "@/components/ui/buttons";
import Dialog, { DialogActions } from "@/components/ui/Dialog";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";

export interface VersionDetailsInput {
  name: string;
  jobTitle: string;
  company: string;
}

interface VersionDialogProps {
  open: boolean;
  mode: "create" | "rename";
  initial?: Partial<VersionDetailsInput>;
  onClose: () => void;
  onSubmit: (details: VersionDetailsInput) => void;
}

/** A version's name defaults to the job it's for. */
export function versionName(details: VersionDetailsInput): string {
  return (
    details.name.trim() ||
    [details.company.trim(), details.jobTitle.trim()].filter(Boolean).join(", ")
  );
}

/** Names a new version and the job it's for, or renames one. */
export default function VersionDialog(props: VersionDialogProps) {
  const [name, setName] = createSignal("");
  const [jobTitle, setJobTitle] = createSignal("");
  const [company, setCompany] = createSignal("");
  const [error, setError] = createSignal("");

  createEffect(() => {
    if (!props.open) return;
    setName(props.initial?.name ?? "");
    setJobTitle(props.initial?.jobTitle ?? "");
    setCompany(props.initial?.company ?? "");
    setError("");
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const details = { name: name(), jobTitle: jobTitle(), company: company() };
    if (!versionName(details)) {
      setError("Add a company, a job title or a name.");
      document.getElementById("version-name")?.focus();
      return;
    }
    props.onSubmit({ ...details, name: versionName(details) });
  };

  return (
    <Dialog
      open={props.open}
      title={props.mode === "create" ? "New version" : "Rename version"}
      description={
        props.mode === "create"
          ? "A version is your resume cut for one job. It starts with everything ticked."
          : undefined
      }
      onClose={props.onClose}
    >
      <form class="mt-4 space-y-4" onSubmit={submit} novalidate>
        <div class="grid gap-4 sm:grid-cols-2">
          <FormField id="version-company" label="Company">
            <Input
              id="version-company"
              name="version-company"
              value={company()}
              onInput={setCompany}
              placeholder="Stripe"
            />
          </FormField>
          <FormField id="version-job" label="Job title">
            <Input
              id="version-job"
              name="version-job"
              value={jobTitle()}
              onInput={setJobTitle}
              placeholder="Backend engineer"
            />
          </FormField>
        </div>
        <FormField
          id="version-name"
          label="Name (optional)"
          hint="Leave it empty to use the company and job title."
          error={error()}
        >
          <Input
            id="version-name"
            name="version-name"
            value={name()}
            onInput={setName}
            placeholder="Stripe, Backend engineer"
            error={!!error()}
            aria-describedby={error() ? "version-name-error" : "version-name-hint"}
          />
        </FormField>
        <DialogActions>
          <button type="button" class={outlineButton} onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" class={primaryButton}>
            {props.mode === "create" ? "Create version" : "Save"}
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
