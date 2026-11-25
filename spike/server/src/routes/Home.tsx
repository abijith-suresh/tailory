import { Title } from "@solidjs/meta";
import { createMemo, For, Loading } from "solid-js";

import { getProfile } from "../server/profile";

export default function Home() {
  const profile = createMemo(() => getProfile());
  return (
    <>
      <Title>Tailory · Home</Title>
      <h1>Tailory spike</h1>
      <Loading fallback={<p>Loading…</p>}>
        <p data-testid="who">
          Signed in as {profile().name} ({profile().email}) · mode {profile().mode} · db{" "}
          {profile().driver}
        </p>
        <ul>
          <For each={profile().resumes}>{(r) => <li>{r.title}</li>}</For>
        </ul>
      </Loading>
      <p>
        <a href="/api/pdf">Download PDF (server-rendered)</a>
      </p>
    </>
  );
}
