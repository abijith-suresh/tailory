import type { JSX } from "solid-js";

/** Small line icons. Decorative: the control that holds one names itself. */
function Icon(props: { children: JSX.Element; size?: number; class?: string }) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class={`shrink-0 ${props.class ?? ""}`}
    >
      {props.children}
    </svg>
  );
}

export const ChevronDown = (p: { class?: string }) => (
  <Icon size={14} class={p.class}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const ArrowUp = () => (
  <Icon>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
);
export const ArrowDown = () => (
  <Icon>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Icon>
);
export const Close = () => (
  <Icon>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const Trash = () => (
  <Icon>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </Icon>
);
export const Plus = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const More = () => (
  <Icon>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </Icon>
);
