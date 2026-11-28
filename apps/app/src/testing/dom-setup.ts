/**
 * jsdom lacks the dialog and popover APIs. These stand-ins do what the components rely on (open
 * state, the close and toggle events) so behaviour tests can run; the browser check in
 * e2e/ covers the real thing.
 */
import { afterEach } from "vitest";

const proto = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>;

if (typeof proto.showModal !== "function") {
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  proto.show = proto.showModal;
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

const element = HTMLElement.prototype as HTMLElement & Record<string, unknown>;

if (typeof element.showPopover !== "function") {
  const toggle = (target: HTMLElement, open: boolean) => {
    if (target.hasAttribute("data-popover-open") === open) return;
    target.toggleAttribute("data-popover-open", open);
    const event = new Event("toggle") as Event & { newState: string; oldState: string };
    event.newState = open ? "open" : "closed";
    event.oldState = open ? "closed" : "open";
    target.dispatchEvent(event);
  };
  element.showPopover = function (this: HTMLElement) {
    toggle(this, true);
  };
  element.hidePopover = function (this: HTMLElement) {
    toggle(this, false);
  };
  // jsdom's own stylesheet hides every popover, which also makes its contents unfocusable.
  const style = document.createElement("style");
  style.textContent = "[popover][data-popover-open] { display: block !important; }";
  document.head.append(style);
}

afterEach(() => {
  document.body.innerHTML = "";
});
