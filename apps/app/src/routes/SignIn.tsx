import { Title } from "@solidjs/meta";
import { createMemo, createSignal, Loading, Show } from "solid-js";

import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { authClient, nextPath, redirectOf } from "../lib/auth-client";
import { getSignInMethods } from "../server/functions";

type Outcome = { data: unknown; error: { message?: string } | null };

export default function SignIn() {
  const methods = createMemo(() => getSignInMethods());
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // Signing in from the MCP authorization flow returns that flow's next step.
  const finish = ({ data, error: failure }: Outcome) => {
    if (failure) {
      setError(failure.message ?? "Sign-in failed. Try again.");
      setPending(false);
      return;
    }
    window.location.assign(redirectOf(data) ?? nextPath(window.location.search));
  };

  const social = async (provider: "github" | "google") => {
    setPending(true);
    setError("");
    finish(
      await authClient.signIn.social({ provider, callbackURL: nextPath(window.location.search) })
    );
  };

  const withEmail = async (event: SubmitEvent) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setError("");
    if ((event.submitter as HTMLButtonElement | null)?.value === "sign-up") {
      const name = String(form.get("name") || email.split("@")[0]);
      finish(await authClient.signUp.email({ email, password, name }));
    } else {
      finish(await authClient.signIn.email({ email, password }));
    }
  };

  const hasSocial = () => methods().github || methods().google;

  return (
    <div class="narrow">
      <Title>Sign in · Tailory</Title>
      <section class="panel stack" aria-labelledby="sign-in-title">
        <h1 class="panel__title" id="sign-in-title">
          Sign in to Tailory
        </h1>
        <Loading fallback={<p class="panel__text">Loading…</p>}>
          <Show when={hasSocial()}>
            <div class="stack">
              <Show when={methods().github}>
                <Button block disabled={pending()} onClick={() => void social("github")}>
                  Continue with GitHub
                </Button>
              </Show>
              <Show when={methods().google}>
                <Button block disabled={pending()} onClick={() => void social("google")}>
                  Continue with Google
                </Button>
              </Show>
            </div>
          </Show>
          <Show when={hasSocial() && methods().emailPassword}>
            <p class="divider">or</p>
          </Show>
          <Show when={methods().emailPassword}>
            <form class="stack" onSubmit={(event) => void withEmail(event)}>
              <Field label="Email" name="email" type="email" autocomplete="email" required />
              <Field
                label="Password"
                name="password"
                type="password"
                autocomplete="current-password"
                minlength={12}
                required
                hint="At least 12 characters."
              />
              <Field
                label="Name"
                name="name"
                autocomplete="name"
                optional
                hint="Only used when you create an account."
              />
              <div class="panel__actions">
                <Button type="submit" variant="primary" value="sign-in" disabled={pending()}>
                  Sign in
                </Button>
                <Button type="submit" value="sign-up" disabled={pending()}>
                  Create account
                </Button>
              </div>
            </form>
          </Show>
        </Loading>
        <p class="form-error" role="alert">
          {error()}
        </p>
      </section>
    </div>
  );
}
