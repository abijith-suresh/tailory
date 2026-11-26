import type { JSX } from "@solidjs/web";
import { renderToString } from "@solidjs/web";
import { JSDOM } from "jsdom";

/** Renders a component the way the server does and parses the HTML, for queries in tests. */
export const renderHtml = (code: () => JSX.Element) =>
  new JSDOM(renderToString(code)).window.document;
