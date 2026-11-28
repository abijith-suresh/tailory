import { createSignal } from "solid-js";

import { signOut } from "../../components/AppHeader";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { deleteAccount } from "../../server/functions";

/** Server mode only: who is signed in, Sign out, and Delete account. */
export default function Account(props: { name: string; email: string }) {
  const [deleting, setDeleting] = createSignal(false);
  const [signingOut, setSigningOut] = createSignal(false);

  const remove = async () => {
    try {
      await deleteAccount();
    } catch {
      throw new Error("Couldn't delete the account. Try again.");
    }
    window.location.assign("/sign-in");
  };

  return (
    <>
      <h2 class="settings__title">Account</h2>
      <div class="settings-rows">
        <dl class="settings-account">
          <div class="definition">
            <dt>Name</dt>
            <dd>{props.name}</dd>
          </div>
          <div class="definition">
            <dt>Email</dt>
            <dd>{props.email}</dd>
          </div>
        </dl>
        <div class="settings-row">
          <div class="settings-row__text">
            <span class="settings-row__name">Sign out</span>
            <span class="settings-row__desc">Your data stays on the server.</span>
          </div>
          <Button
            busy={signingOut()}
            onClick={() => {
              setSigningOut(true);
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
        <div class="settings-row settings-row--danger">
          <div class="settings-row__text">
            <span class="settings-row__name">Delete account</span>
            <span class="settings-row__desc">
              Deletes your account, profile and applications from the server.
            </span>
          </div>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Delete account…
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={deleting()}
        onClose={() => setDeleting(false)}
        title="Delete your account?"
        word="delete"
        action="Delete account"
        onConfirm={remove}
      >
        <p>
          This deletes your account, your profile and every application for good. Export first from
          Data if you might want them back.
        </p>
      </ConfirmDialog>
    </>
  );
}
