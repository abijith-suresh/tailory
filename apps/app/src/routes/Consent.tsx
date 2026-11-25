import { Meta, Title } from "@solidjs/meta";
import { createSignal, onSettled } from "solid-js";

import { authClient, redirectOf } from "../lib/auth-client";

// Better Auth sends people here when an agent asks to use their account. The page's query is the
// signed authorization request; the auth client sends it back with the answer.
export default function Consent() {
  const [client, setClient] = createSignal("");
  const [scopes, setScopes] = createSignal<string[]>([]);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  onSettled(() => {
    const query = new URLSearchParams(window.location.search);
    setClient(query.get("client_id") ?? "");
    setScopes(query.get("scope")?.split(" ") ?? []);
  });

  const decide = async (accept: boolean) => {
    setPending(true);
    setError("");
    const { data, error: failure } = await authClient.$fetch("/oauth2/consent", {
      method: "POST",
      body: { accept },
    });
    const to = redirectOf(data);
    if (failure || !to) {
      setError(failure?.message ?? "Something went wrong. Try again.");
      setPending(false);
      return;
    }
    window.location.assign(to);
  };

  return (
    <>
      <Title>Allow access · Tailory</Title>
      <Meta name="referrer" content="no-referrer" />
      <h1>Allow an agent to use your Tailory account?</h1>
      <p>Agent: {client()}</p>
      <p>Requested access: {scopes().join(", ")}</p>
      <p>
        <button type="button" disabled={pending()} onClick={() => void decide(true)}>
          Allow
        </button>{" "}
        <button type="button" disabled={pending()} onClick={() => void decide(false)}>
          Deny
        </button>
      </p>
      <p role="alert">{error()}</p>
    </>
  );
}
