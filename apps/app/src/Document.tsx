import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";

import { THEME_SCRIPT } from "./lib/theme";

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        {/* Sets a pinned theme before the first paint. */}
        <script innerHTML={THEME_SCRIPT} />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
