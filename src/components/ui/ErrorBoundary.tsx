import { type Component, type JSX, ErrorBoundary as SolidErrorBoundary } from "solid-js";

interface ErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (err: Error, reset: () => void) => JSX.Element;
}

const ErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  const defaultFallback = (err: Error, reset: () => void) => (
    <div role="alert" class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p class="mb-2 font-semibold text-red-700">Something went wrong</p>
      <p class="mb-4 text-sm text-red-600">{err.message}</p>
      <button
        type="button"
        onClick={reset}
        class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
      >
        Try again
      </button>
    </div>
  );

  return (
    <SolidErrorBoundary fallback={props.fallback ?? defaultFallback}>
      {props.children}
    </SolidErrorBoundary>
  );
};

export default ErrorBoundary;
