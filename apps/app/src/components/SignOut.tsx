import { createSignal } from "solid-js";

import { authClient } from "../lib/auth-client";
import { Button } from "./Button";

export function SignOut() {
  const [pending, setPending] = createSignal(false);
  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/sign-in");
  };
  return (
    <Button variant="quiet" disabled={pending()} onClick={() => void signOut()}>
      Sign out
    </Button>
  );
}
