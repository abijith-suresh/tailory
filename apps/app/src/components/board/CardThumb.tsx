import { createSignal, createUniqueId, onSettled, Show } from "solid-js";

import { drawPdfPages } from "../../lib/pdf";
import { getCardPdf } from "../../server/functions";

// Page one of each card's PDF, drawn small with pdf.js once the card comes into view. Drawn
// thumbnails are kept by application and version for the page's lifetime in this tab, so a card
// moving to another column, or the board coming back, shows its picture at once.

const drawn = new Map<string, Promise<string | null>>();

// A few at a time: each one asks the server to print the resume.
const MAX_AT_ONCE = 3;
let running = 0;
const waiting: (() => void)[] = [];
const slot = async () => {
  if (running >= MAX_AT_ONCE) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
};
const release = () => {
  running--;
  waiting.shift()?.();
};

/** Thumbnails are drawn twice as sharp as their box on high-density screens. */
const THUMB_WIDTH_PX = 56;
const LETTER_WIDTH_PT = 612;

const drawThumbnail = async (id: string): Promise<string | null> => {
  await slot();
  try {
    const pdf = await getCardPdf(id);
    if (!pdf) return null;
    const density = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2) * 1.5;
    const [canvas] = await drawPdfPages(pdf, (THUMB_WIDTH_PX * density) / LETTER_WIDTH_PT, 1);
    return canvas ? canvas.toDataURL("image/png") : null;
  } finally {
    release();
  }
};

const thumbnail = (id: string, version: string) => {
  const key = `${id}|${version}`;
  let picture = drawn.get(key);
  if (!picture) {
    picture = drawThumbnail(id).catch(() => {
      drawn.delete(key);
      return null;
    });
    drawn.set(key, picture);
  }
  return picture;
};

/** Page one of an application's resume, small. Blank paper until it is drawn. */
export function CardThumb(props: { id: string; version: string }) {
  const domId = createUniqueId();
  const [src, setSrc] = createSignal<string | null>(null);

  // Runs in the browser only. Created on both sides, so hydration keys match.
  onSettled(() => {
    // By id: under hydration a ref can hand over an element that never reaches the page.
    const element = document.getElementById(domId);
    if (!element) return;
    let live = true;
    const load = () => {
      void thumbnail(props.id, props.version).then((url) => {
        if (live && url) setSrc(url);
      });
    };
    if (typeof IntersectionObserver === "undefined") {
      load();
      return () => {
        live = false;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "200px" }
    );
    observer.observe(element);
    return () => {
      live = false;
      observer.disconnect();
    };
  });

  return (
    <span class="board-thumb" id={domId} aria-hidden="true">
      <Show when={src()}>{(url) => <img src={url()} alt="" draggable={false} />}</Show>
    </span>
  );
}
