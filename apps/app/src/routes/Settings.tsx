import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";

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
      <h1>Settings</h1>
      <p>
        <a href="/">Back</a>
      </p>
      <h2>Delete account</h2>
      <p>Deletes your account and everything Tailory keeps for it.</p>
      <button type="button" disabled={pending()} onClick={() => void remove()}>
        Delete my account
      </button>
      <p role="alert">{error()}</p>
    </>
  );
}
