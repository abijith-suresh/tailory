const CHANNEL_NAME = "tailory-editor";
const ACTIVE_MESSAGE = "active";

/**
 * Lets one editor tab at a time autosave. `claim` tells other tabs that this one now saves;
 * `onReplaced` runs when another tab claims it.
 */
export function joinEditorTabs(onReplaced: () => void) {
  if (typeof BroadcastChannel === "undefined") {
    return { claim() {}, close() {} };
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent) => {
    if (event.data === ACTIVE_MESSAGE) onReplaced();
  };

  return {
    claim: () => channel.postMessage(ACTIVE_MESSAGE),
    close: () => channel.close(),
  };
}
