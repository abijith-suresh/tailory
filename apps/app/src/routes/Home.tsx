import { createMemo, Loading, Show } from "solid-js";

import { SignOut } from "../components/SignOut";
import { getViewer } from "../server/functions";

export default function Home() {
  const viewer = createMemo(() => getViewer());
  return (
    <>
      <h1>Tailory</h1>
      <p>Tailory is running.</p>
      <Loading fallback={<p>Loading…</p>}>
        <p>
          {viewer().mode === "local"
            ? "Local mode: no sign-in on this computer."
            : `Signed in as ${viewer().name} (${viewer().email}).`}
        </p>
        <nav>
          <a href="/settings">Settings</a>
          <Show when={viewer().mode === "server"}>
            {" · "}
            <SignOut />
          </Show>
        </nav>
      </Loading>
    </>
  );
}
