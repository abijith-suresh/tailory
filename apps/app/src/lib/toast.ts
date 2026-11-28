/**
 * Toasts: one short line at the bottom of the screen, with an optional action such as Undo.
 * One shows at a time; a new one replaces the last. They are for things that just happened on
 * this page, so the shell clears them when you go to another page.
 *
 *   toast("Orbital Maps moved to Applied", { action: { label: "Undo", run: undoMove } });
 *   toast("Couldn't save. Check your connection.", { tone: "error", action: { label: "Retry", run } });
 */
import { createSignal } from "solid-js";

import { duration } from "./motion";

export type ToastAction = { label: string; run: () => void };

export type ToastOptions = {
  action?: ToastAction;
  /** Errors stay until dismissed or acted on, and are announced at once. */
  tone?: "neutral" | "error";
  /** How long it stays, in ms. Default 6 s with an action, 4 s without; errors stay. */
  duration?: number;
};

export type ToastItem = {
  id: number;
  message: string;
  action?: ToastAction;
  tone: "neutral" | "error";
  leaving: boolean;
};

type Timer = { handle?: ReturnType<typeof setTimeout>; remaining: number; started: number };

const [items, setItems] = createSignal<ToastItem[]>([]);
// Solid applies signal writes at its next flush, so the store keeps its own current copy to read.
let current: ToastItem[] = [];
const commit = (next: ToastItem[]) => {
  current = next;
  setItems(next);
};
const timers = new Map<number, Timer>();
let nextId = 1;

/** The toasts on screen, oldest first. The one leaving, if any, comes before the new one. */
export const toasts = items;

const startTimer = (id: number) => {
  const timer = timers.get(id);
  if (!timer || timer.handle !== undefined) return;
  timer.started = Date.now();
  timer.handle = setTimeout(() => dismissToast(id), timer.remaining);
};

const stopTimer = (id: number) => {
  const timer = timers.get(id);
  if (!timer || timer.handle === undefined) return;
  clearTimeout(timer.handle);
  timer.handle = undefined;
  timer.remaining = Math.max(1000, timer.remaining - (Date.now() - timer.started));
};

/** Shows a toast and returns its id. Any toast already showing leaves. */
export function toast(message: string, options: ToastOptions = {}): number {
  for (const item of current) if (!item.leaving) dismissToast(item.id);
  const id = nextId++;
  const tone = options.tone ?? "neutral";
  commit([...current, { id, message, action: options.action, tone, leaving: false }]);
  const life = options.duration ?? (tone === "error" ? 0 : options.action ? 6000 : 4000);
  if (life > 0) {
    timers.set(id, { remaining: life, started: 0 });
    startTimer(id);
  }
  return id;
}

/** Plays the toast's exit, then removes it. */
export function dismissToast(id: number) {
  const item = current.find((toast) => toast.id === id);
  if (!item || item.leaving) return;
  stopTimer(id);
  timers.delete(id);
  commit(current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
  setTimeout(() => commit(current.filter((toast) => toast.id !== id)), duration("exit") + 20);
}

/** Runs the toast's action, then dismisses it. */
export function actOnToast(id: number) {
  const item = current.find((toast) => toast.id === id);
  if (!item || item.leaving) return;
  dismissToast(id);
  item.action?.run();
}

/** Holds a toast while the pointer or focus is on it, so there's time to reach the action. */
export const pauseToast = stopTimer;
export const resumeToast = startTimer;

/** Removes every toast at once, without an exit. The shell calls this on navigation. */
export function clearToasts() {
  for (const timer of timers.values()) clearTimeout(timer.handle);
  timers.clear();
  if (current.length > 0) commit([]);
}
