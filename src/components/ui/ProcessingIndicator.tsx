import type { Component } from "solid-js";

interface ProcessingIndicatorProps {
  message?: string;
}

const ProcessingIndicator: Component<ProcessingIndicatorProps> = (props) => (
  <div
    class="flex flex-col items-center justify-center gap-4 py-12"
    role="status"
    aria-live="polite"
  >
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    <p class="text-sm font-medium text-gray-600">{props.message ?? "Processing resume…"}</p>
  </div>
);

export default ProcessingIndicator;
