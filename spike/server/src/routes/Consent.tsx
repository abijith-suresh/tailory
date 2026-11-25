import { Title } from "@solidjs/meta";
import { createSignal, onSettled } from "solid-js";

export default function Consent() {
  const [query, setQuery] = createSignal("");
  onSettled(() => {
    setQuery(window.location.search.slice(1));
  });
  const decide = async (accept: boolean) => {
    const res = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: query() }),
    });
    const data = (await res.json()) as { url?: string; redirect_uri?: string };
    const to = data.url ?? data.redirect_uri;
    if (to) window.location.assign(to);
  };
  return (
    <>
      <Title>Tailory · Authorize agent</Title>
      <h1>Authorize agent</h1>
      <p>An agent wants to read your resumes.</p>
      <button type="button" onClick={() => void decide(true)}>
        Allow
      </button>{" "}
      <button type="button" onClick={() => void decide(false)}>
        Deny
      </button>
    </>
  );
}
