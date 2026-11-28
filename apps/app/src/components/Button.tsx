import type { JSX } from "@solidjs/web";
import { omit } from "solid-js";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "danger-solid";

type Look = {
  variant?: ButtonVariant;
  /** 30px instead of 36px, for toolbars and rows. */
  size?: "small";
  /** A square button holding only an icon. Give it an aria-label. */
  icon?: boolean;
  /** Fill the width of the container. */
  block?: boolean;
};

const classes = (look: Look, extra: JSX.HTMLAttributes<HTMLElement>["class"]) => [
  "button",
  `button--${look.variant ?? "secondary"}`,
  {
    "button--small": look.size === "small",
    "button--icon": Boolean(look.icon),
    "button--block": Boolean(look.block),
  },
  extra,
];

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  Look & {
    /** Working: a spinner replaces the label (which keeps the width) and clicks are ignored. */
    busy?: boolean;
  };

/**
 * A button. Secondary unless told otherwise; `type` defaults to "button". It presses down with
 * weight (see "Motion" in the README) and takes the one hover and press tint.
 */
export function Button(props: ButtonProps) {
  const rest = omit(props, "variant", "size", "icon", "block", "busy", "class", "type");
  return (
    <button
      {...rest}
      type={props.type ?? "button"}
      class={classes(props, props.class)}
      aria-busy={props.busy ? "true" : undefined}
    />
  );
}

type LinkButtonProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & Look;

/** A link that looks like a button, for actions that go somewhere. */
export function LinkButton(props: LinkButtonProps) {
  const rest = omit(props, "variant", "size", "icon", "block", "class");
  return <a {...rest} class={classes(props, props.class)} />;
}
