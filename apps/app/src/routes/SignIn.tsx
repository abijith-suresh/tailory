import { Title } from "@solidjs/meta";
import { createMemo, createSignal, Loading, Show } from "solid-js";

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

  return (
    <>
      <Title>Sign in · Tailory</Title>
      <h1>Sign in to Tailory</h1>
      <Loading fallback={<p>Loading…</p>}>
        <Show when={methods().github}>
          <p>
            <button type="button" disabled={pending()} onClick={() => void social("github")}>
              Continue with GitHub
            </button>
          </p>
        </Show>
        <Show when={methods().google}>
          <p>
            <button type="button" disabled={pending()} onClick={() => void social("google")}>
              Continue with Google
            </button>
          </p>
        </Show>
        <Show when={methods().emailPassword}>
          <form onSubmit={(event) => void withEmail(event)}>
            <p>
              <label>
                Email <input name="email" type="email" autocomplete="email" required />
              </label>
            </p>
            <p>
              <label>
                Password{" "}
                <input
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  minlength={12}
                  required
                />
              </label>
            </p>
            <p>
              <label>
                Name (new accounts) <input name="name" autocomplete="name" />
              </label>
            </p>
            <p>
              <button type="submit" value="sign-in" disabled={pending()}>
                Sign in
              </button>{" "}
              <button type="submit" value="sign-up" disabled={pending()}>
                Create account
              </button>
            </p>
          </form>
        </Show>
      </Loading>
      <p role="alert">{error()}</p>
    </>
  );
}
