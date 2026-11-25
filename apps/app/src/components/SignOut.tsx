import { createSignal } from "solid-js";

import { authClient } from "../lib/auth-client";

export function SignOut() {
  const [pending, setPending] = createSignal(false);
  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/sign-in");
  };
  return (
    <button type="button" disabled={pending()} onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
