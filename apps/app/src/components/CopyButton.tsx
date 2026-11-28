import { createSignal, onSettled } from "solid-js";

import { Button } from "./Button";

type CopyButtonProps = {
  text: string;
  /** What is copied, for screen readers: "Copy the MCP address". Defaults to "Copy". */
  label?: string;
};

/** Copies `text` and says so for a moment. The result is announced to screen readers. */
export function CopyButton(props: CopyButtonProps) {
  const [state, setState] = createSignal<"idle" | "copied" | "failed">("idle");
  let timer: ReturnType<typeof setTimeout> | undefined;
  onSettled(() => () => clearTimeout(timer));

  const copy = async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(props.text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <Button
      variant="quiet"
      class="copy-button"
      aria-label={props.label}
      onClick={() => void copy()}
    >
      <span aria-hidden={props.label ? "true" : undefined}>
        {state() === "copied" ? "Copied" : state() === "failed" ? "Select and copy" : "Copy"}
      </span>
      <span class="visually-hidden" role="status">
        {state() === "copied" ? "Copied" : state() === "failed" ? "Couldn't copy" : ""}
      </span>
    </Button>
  );
}

/** A block of text to copy: a command, a config snippet, a prompt. */
export function CodeBlock(props: { code: string; label: string }) {
  return (
    <div class="code-block">
      <pre class="code-block__pre" tabindex="0" aria-label={props.label}>
        <code>{props.code}</code>
      </pre>
      <CopyButton text={props.code} label={`Copy: ${props.label}`} />
    </div>
  );
}
