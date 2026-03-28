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
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-[#ccddd4] border-t-[#1d6648]" />
    <p class="text-sm font-medium text-gray-600">{props.message ?? "Processing resume…"}</p>
  </div>
);

export default ProcessingIndicator;
