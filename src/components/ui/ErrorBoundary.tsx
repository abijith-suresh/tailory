import { type Component, type JSX, ErrorBoundary as SolidErrorBoundary } from "solid-js";

import { outlineButton } from "./buttons";

interface ErrorBoundaryProps {
  children: JSX.Element;
}

const ErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  const fallback = (err: Error, reset: () => void) => (
    <div role="alert" class="m-4 rounded-xl bg-surface p-6 ring-1 ring-danger/40">
      <p class="text-ui-md">Something went wrong here.</p>
      <p class="mt-1 text-body-sm text-fg-muted">{err.message}</p>
      <button type="button" onClick={reset} class={`${outlineButton} mt-4`}>
        Try again
      </button>
    </div>
  );

  return <SolidErrorBoundary fallback={fallback}>{props.children}</SolidErrorBoundary>;
};

export default ErrorBoundary;
