import { Title } from "@solidjs/meta";
import type { StartRequestEvent } from "@solidjs/vite-plugin";
import { getRequestEvent, isServer } from "@solidjs/web";

export default function NotFound() {
  if (isServer) {
    const event = getRequestEvent() as StartRequestEvent | undefined;
    if (event) event.response.status = 404;
  }
  return (
    <>
      <Title>Not found · Tailory</Title>
      <h1>Page not found</h1>
      <p>
        <a href="/">Go to the start page</a>
      </p>
    </>
  );
}
