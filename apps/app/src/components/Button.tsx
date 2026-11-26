import type { JSX } from "@solidjs/web";
import { omit } from "solid-js";

export type ButtonVariant = "primary" | "secondary" | "quiet";

const classes = (
  variant: ButtonVariant | undefined,
  block: boolean | undefined,
  extra: JSX.HTMLAttributes<HTMLElement>["class"]
) => ["button", `button--${variant ?? "secondary"}`, { "button--block": Boolean(block) }, extra];

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Fill the width of the container. */
  block?: boolean;
};

/** A button. Secondary unless told otherwise; `type` defaults to "button". */
export function Button(props: ButtonProps) {
  const rest = omit(props, "variant", "block", "class", "type");
  return (
    <button
      {...rest}
      type={props.type ?? "button"}
      class={classes(props.variant, props.block, props.class)}
    />
  );
}

type LinkButtonProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  block?: boolean;
};

/** A link that looks like a button, for actions that go somewhere. */
export function LinkButton(props: LinkButtonProps) {
  const rest = omit(props, "variant", "block", "class");
  return <a {...rest} class={classes(props.variant, props.block, props.class)} />;
}
