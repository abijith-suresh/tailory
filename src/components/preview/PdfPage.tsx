import type { Content, Style, StyleDictionary, TDocumentDefinitions } from "pdfmake/interfaces";
import { For, type JSX, Match, Show, Switch } from "solid-js";
import { ROBOTO_LINE_HEIGHT } from "@/lib/fit/fit";
import { RESUME_PREVIEW_FONT_FAMILY } from "@/lib/resume/design";

/** A4 in points, as pdfmake sets it. CSS points are the same unit, so the page is drawn 1:1. */
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;
/** One CSS point in pixels. */
export const PX_PER_PT = 96 / 72;

/** Where a page starts, keyed by the block it starts with. */
export interface PageBreakMark {
  page: number;
  /** Past the page target. */
  over: boolean;
}

interface Node {
  text?: unknown;
  stack?: Content[];
  columns?: Content[];
  canvas?: {
    type: string;
    x1?: number;
    x2?: number;
    y1?: number;
    y2?: number;
    lineWidth?: number;
    lineColor?: string;
  }[];
  style?: string | string[];
  margin?: Style["margin"];
  width?: number | string;
  columnGap?: number;
  id?: string;
}

const STYLE_KEYS = [
  "fontSize",
  "bold",
  "italics",
  "color",
  "lineHeight",
  "decoration",
  "alignment",
] as const;

function margins(margin: Style["margin"]): [number, number, number, number] | undefined {
  if (margin === undefined) return undefined;
  if (typeof margin === "number") return [margin, margin, margin, margin];
  if (margin.length === 2) return [margin[0], margin[1], margin[0], margin[1]];
  return [margin[0], margin[1], margin[2], margin[3]];
}

/** pdfmake orders sides left, top, right, bottom; CSS top, right, bottom, left. */
const cssSides = ([left, top, right, bottom]: [number, number, number, number]) =>
  `${top}pt ${right}pt ${bottom}pt ${left}pt`;

/**
 * The CSS for a node, read the way pdfmake reads it: its named styles in order, then its own
 * properties. Font properties pass down to children through CSS inheritance, as they do in pdfmake;
 * margins belong to the node alone.
 */
function nodeStyle(node: Node, styles: StyleDictionary): JSX.CSSProperties {
  const names =
    node.style === undefined ? [] : Array.isArray(node.style) ? node.style : [node.style];
  const merged: Style = {};
  for (const name of names) Object.assign(merged, styles[name]);
  const own = node as Style;
  for (const key of STYLE_KEYS)
    if (own[key] !== undefined) Object.assign(merged, { [key]: own[key] });
  const margin = margins(own.margin ?? merged.margin);

  const css: JSX.CSSProperties = {};
  if (merged.fontSize !== undefined) css["font-size"] = `${merged.fontSize}pt`;
  if (merged.bold !== undefined) css["font-weight"] = merged.bold ? 500 : 400;
  if (merged.italics !== undefined) css["font-style"] = merged.italics ? "italic" : "normal";
  if (merged.color !== undefined) css.color = merged.color;
  if (merged.lineHeight !== undefined) css["line-height"] = merged.lineHeight * ROBOTO_LINE_HEIGHT;
  if (merged.decoration === "underline") css["text-decoration"] = "underline";
  if (merged.alignment !== undefined) css["text-align"] = merged.alignment;
  if (margin) css.margin = cssSides(margin);
  return css;
}

/** A line across the whole page where a new page starts, with the page number. */
function BreakMark(props: { mark: PageBreakMark; side: [number, number] }) {
  const label = () => `Page ${props.mark.page}`;
  return (
    <div
      role="separator"
      aria-label={props.mark.over ? `${label()}, past the target` : label()}
      class="page-break"
      classList={{ "page-break--over": props.mark.over }}
      style={{ "margin-left": `-${props.side[0]}pt`, "margin-right": `-${props.side[1]}pt` }}
    >
      <span class="page-break__label">{label()}</span>
    </div>
  );
}

interface RenderContext {
  styles: StyleDictionary;
  breaks: ReadonlyMap<string, PageBreakMark>;
  side: [number, number];
}

function Blocks(props: { items: Content[]; context: RenderContext }) {
  return (
    <For each={props.items}>
      {(item) => {
        const id = (item as Node | null)?.id;
        const mark = () => (id ? props.context.breaks.get(id) : undefined);
        return (
          <>
            <Show when={mark()}>{(m) => <BreakMark mark={m()} side={props.context.side} />}</Show>
            <Block node={item} context={props.context} />
          </>
        );
      }}
    </For>
  );
}

function columnFlex(width: Node["width"]): JSX.CSSProperties {
  if (typeof width === "number") return { flex: `0 0 ${width}pt` };
  if (width === "auto") return { flex: "0 0 auto" };
  return { flex: "1 1 0%", "min-width": 0 };
}

function Block(props: { node: Content; context: RenderContext }): JSX.Element {
  const node = () => props.node as Node;
  return (
    <Switch>
      <Match when={Array.isArray(props.node)}>
        <Blocks items={props.node as Content[]} context={props.context} />
      </Match>
      <Match when={props.node === null || typeof props.node !== "object"}>{null}</Match>
      <Match when={node().stack}>
        {(stack) => (
          <div class="flex flex-col" style={nodeStyle(node(), props.context.styles)}>
            <Blocks items={stack()} context={props.context} />
          </div>
        )}
      </Match>
      <Match when={node().columns}>
        {(columns) => (
          <div
            class="flex items-start"
            style={{
              ...nodeStyle(node(), props.context.styles),
              gap: `${node().columnGap ?? 0}pt`,
            }}
          >
            <For each={columns()}>
              {(column) => (
                <div style={columnFlex((column as Node).width)}>
                  <Block node={column} context={props.context} />
                </div>
              )}
            </For>
          </div>
        )}
      </Match>
      <Match when={node().canvas}>
        {(canvas) => (
          <div class="relative" style={{ ...nodeStyle(node(), props.context.styles), height: 0 }}>
            <For each={canvas().filter((vector) => vector.type === "line")}>
              {(line) => {
                const width = line.lineWidth ?? 1;
                return (
                  <div
                    class="absolute"
                    style={{
                      left: `${Math.min(line.x1 ?? 0, line.x2 ?? 0)}pt`,
                      width: `${Math.abs((line.x2 ?? 0) - (line.x1 ?? 0))}pt`,
                      top: `${(line.y1 ?? 0) - width / 2}pt`,
                      height: `${width}pt`,
                      background: line.lineColor ?? "#000000",
                    }}
                  />
                );
              }}
            </For>
          </div>
        )}
      </Match>
      <Match when={node().text !== undefined}>
        <div class="pdf-text" style={nodeStyle(node(), props.context.styles)}>
          {String(node().text)}
        </div>
      </Match>
    </Switch>
  );
}

/**
 * Draws a pdfmake document as HTML at its own size in points: the same blocks, styles and margins
 * the PDF is printed from. Page breaks come from pdfmake's layout and are drawn before the block
 * each page starts with.
 */
export default function PdfPage(
  props: {
    doc: TDocumentDefinitions;
    breaks: ReadonlyMap<string, PageBreakMark>;
  } & JSX.HTMLAttributes<HTMLDivElement>
) {
  const pageMargins = () => margins(props.doc.pageMargins as Style["margin"]) ?? [40, 40, 40, 40];
  const context = (): RenderContext => ({
    styles: props.doc.styles ?? {},
    breaks: props.breaks,
    side: [pageMargins()[0], pageMargins()[2]],
  });
  const base = () => props.doc.defaultStyle ?? {};

  return (
    <div
      role={props.role}
      aria-label={props["aria-label"]}
      class={`pdf-page flex flex-col bg-sheet text-[#111827] ${props.class ?? ""}`}
      style={{
        ...(typeof props.style === "object" ? props.style : {}),
        width: `${A4_WIDTH_PT}pt`,
        "min-height": `${A4_HEIGHT_PT}pt`,
        padding: cssSides(pageMargins()),
        "font-family": RESUME_PREVIEW_FONT_FAMILY,
        "font-size": `${base().fontSize ?? 12}pt`,
        "line-height": (base().lineHeight ?? 1) * ROBOTO_LINE_HEIGHT,
      }}
    >
      <Block node={props.doc.content} context={context()} />
    </div>
  );
}
