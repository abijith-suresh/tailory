import { Title } from "@solidjs/meta";
import type { StartRequestEvent } from "@solidjs/vite-plugin";
import { getRequestEvent, isServer } from "@solidjs/web";

import { LinkButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

export default function NotFound() {
  if (isServer) {
    const event = getRequestEvent() as StartRequestEvent | undefined;
    if (event) event.response.status = 404;
  }
  return (
    <>
      <Title>Not found · Tailory</Title>
      <div class="page-head">
        <h1 class="page-title">Page not found</h1>
      </div>
      <EmptyState
        title="Nothing lives at this address"
        actions={
          <LinkButton variant="primary" href="/">
            Go to applications
          </LinkButton>
        }
      >
        <p>Check the address, or start again from your applications.</p>
      </EmptyState>
    </>
  );
}
