import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";

import { Button } from "../components/Button";
import { deleteAccount } from "../server/functions";

export default function Settings() {
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  const remove = async () => {
    if (!window.confirm("Delete your account and everything in it? This can't be undone.")) return;
    setPending(true);
    setError("");
    try {
      await deleteAccount();
      window.location.assign("/");
    } catch {
      setError("Couldn't delete the account. Try again.");
      setPending(false);
    }
  };

  return (
    <>
      <Title>Settings · Tailory</Title>
      <div class="page-head">
        <h1 class="page-title">Settings</h1>
      </div>
      <section class="panel" aria-labelledby="delete-account">
        <h2 class="panel__title" id="delete-account">
          Delete account
        </h2>
        <p class="panel__text">
          Deletes your account and everything Tailory keeps for it. This can't be undone.
        </p>
        <div class="panel__actions">
          <Button disabled={pending()} onClick={() => void remove()}>
            Delete my account
          </Button>
        </div>
        <p class="form-error" role="alert">
          {error()}
        </p>
      </section>
    </>
  );
}
