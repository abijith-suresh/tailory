import type { PrintJobPayload } from "./print-job";

type PrintChannelMessage =
  | { type: "request" }
  | { payload: PrintJobPayload; type: "payload" }
  | { type: "ack" };

function getChannelName(jobId: string): string {
  return `tailory:print-job:${jobId}`;
}

function supportsBroadcastChannel(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

export function sharePrintJob(jobId: string, payload: PrintJobPayload): () => void {
  if (!supportsBroadcastChannel()) {
    return () => undefined;
  }

  const channel = new BroadcastChannel(getChannelName(jobId));
  const timeout = window.setTimeout(() => channel.close(), 5000);

  channel.onmessage = (event: MessageEvent<PrintChannelMessage>) => {
    if (event.data?.type === "request") {
      channel.postMessage({ payload, type: "payload" });
      return;
    }

    if (event.data?.type === "ack") {
      window.clearTimeout(timeout);
      channel.close();
    }
  };

  return () => {
    window.clearTimeout(timeout);
    channel.close();
  };
}

export function waitForSharedPrintJob(
  jobId: string,
  onPayload: (payload: PrintJobPayload) => void
): () => void {
  if (!supportsBroadcastChannel()) {
    return () => undefined;
  }

  const channel = new BroadcastChannel(getChannelName(jobId));
  const interval = window.setInterval(() => {
    channel.postMessage({ type: "request" });
  }, 200);
  const timeout = window.setTimeout(() => {
    window.clearInterval(interval);
    channel.close();
  }, 5000);

  channel.onmessage = (event: MessageEvent<PrintChannelMessage>) => {
    if (event.data?.type !== "payload") {
      return;
    }

    onPayload(event.data.payload);
    channel.postMessage({ type: "ack" });
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    channel.close();
  };

  channel.postMessage({ type: "request" });

  return () => {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    channel.close();
  };
}
