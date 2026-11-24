/** Button classes for the editor, on the site's sizes: 44px on phones, 36px from md. */
export const buttonSize = "h-11 px-4 text-ui-sm md:h-9 md:px-3";
export const primaryButton = `btn-primary ${buttonSize} disabled:cursor-not-allowed disabled:opacity-50`;
export const quietButton = `btn-quiet ${buttonSize} disabled:cursor-not-allowed disabled:opacity-50`;
export const outlineButton = `btn-quiet ${buttonSize} ring-1 ring-line-strong ring-inset disabled:cursor-not-allowed disabled:opacity-50`;
export const dangerButton = `inline-flex items-center justify-center gap-2 rounded-button bg-danger text-on-primary transition-colors hover:bg-danger/90 ${buttonSize}`;
/** A square icon button. Give it an aria-label. */
export const iconButton =
  "btn-quiet size-11 shrink-0 text-fg-muted hover:text-fg md:size-9 disabled:cursor-not-allowed disabled:opacity-40";
/** A text-sized action inside a line of text. */
export const inlineAction =
  "rounded-xs text-ui-xs text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary";
