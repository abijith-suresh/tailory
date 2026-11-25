import { Title } from "@solidjs/meta";
import { createSignal } from "solid-js";

const post = async (path: string, body: unknown) => {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ url?: string; redirect?: boolean; message?: string }>;
};

export default function SignIn() {
  const [error, setError] = createSignal("");
  const social = async (provider: "github" | "google") => {
    const data = await post("/sign-in/social", { provider, callbackURL: "/" });
    if (data.url) window.location.assign(data.url);
    else setError(data.message ?? "failed");
  };
  return (
    <>
      <Title>Tailory · Sign in</Title>
      <h1>Sign in</h1>
      <button type="button" onClick={() => void social("github")}>
        Continue with GitHub
      </button>{" "}
      <button type="button" onClick={() => void social("google")}>
        Continue with Google
      </button>
      <p role="alert">{error()}</p>
    </>
  );
}
