import { Meta, Title } from "@solidjs/meta";
import { createSignal, onSettled } from "solid-js";

import { Button } from "../components/Button";
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
    <div class="narrow">
      <Title>Allow access · Tailory</Title>
      <Meta name="referrer" content="no-referrer" />
      <section class="panel stack" aria-labelledby="consent-title">
        <h1 class="panel__title" id="consent-title">
          Allow an agent to use your Tailory account?
        </h1>
        <p class="panel__text">If you allow it, the agent can use Tailory's tools as you.</p>
        <dl class="stack">
          <div class="definition">
            <dt>Agent</dt>
            <dd>{client()}</dd>
          </div>
          <div class="definition">
            <dt>Access requested</dt>
            <dd>{scopes().join(", ")}</dd>
          </div>
        </dl>
        <div class="panel__actions">
          <Button variant="primary" disabled={pending()} onClick={() => void decide(true)}>
            Allow
          </Button>
          <Button disabled={pending()} onClick={() => void decide(false)}>
            Deny
          </Button>
        </div>
        <p class="form-error" role="alert">
          {error()}
        </p>
      </section>
    </div>
  );
}
