import type { JSX } from "@solidjs/web";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";
import { Field } from "./Field";
import { renderHtml } from "./render.testing";
import { Segmented } from "./Segmented";
import { Select } from "./Select";
import { SideNav } from "./SideNav";
import { STATUSES, StatusBadge } from "./StatusBadge";
import { BOARD_STATUSES, OfferTag, OUTCOMES, OutcomeTag, StatusTag } from "./StatusTag";
import { Switch } from "./Switch";

describe("Button", () => {
  it("defaults to a secondary button of type button", () => {
    const button = renderHtml(() => <Button>Save</Button>).querySelector("button");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.className).toBe("button button--secondary");
  });

  it("takes a variant and keeps a submit type", () => {
    const button = renderHtml(() => (
      <Button type="submit" variant="primary" block>
        Go
      </Button>
    )).querySelector("button");
    expect(button?.getAttribute("type")).toBe("submit");
    expect(button?.className).toBe("button button--primary button--block");
  });

  it("makes small, icon and busy buttons", () => {
    const button = renderHtml(() => (
      <Button variant="quiet" size="small" icon aria-label="Close" busy>
        x
      </Button>
    )).querySelector("button");
    expect(button?.className).toBe("button button--quiet button--small button--icon");
    expect(button?.getAttribute("aria-busy")).toBe("true");
  });
});

describe("Field", () => {
  it("puts an error in the label's row and keeps the label for screen readers", () => {
    const doc = renderHtml(() => <Field id="start" label="Start" error="Start is needed" />);
    const label = doc.querySelector("label");
    expect(label?.textContent).toBe("Start");
    expect(label?.classList.contains("visually-hidden")).toBe(true);
    expect(doc.querySelector(".field__head .field__error")?.textContent).toBe("Start is needed");
    expect(doc.querySelector(".field__hint")).toBeNull();
  });

  it("ties the label, hint and error to the input", () => {
    const doc = renderHtml(() => (
      <Field id="role" label="Role" hint="As on the posting." error="Needed." />
    ));
    const input = doc.querySelector("input");
    expect(doc.querySelector("label")?.getAttribute("for")).toBe("role");
    expect(input?.getAttribute("aria-describedby")).toBe("role-hint role-error");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("leaves the input valid without an error", () => {
    const input = renderHtml(() => <Field id="x" label="X" />).querySelector("input");
    expect(input?.hasAttribute("aria-invalid")).toBe(false);
    expect(input?.hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("Select", () => {
  it("is a real select with the options and the chosen one selected", () => {
    const doc = renderHtml(() => (
      <Select
        id="status"
        label="Status"
        value="applied"
        options={[
          { value: "drafting", label: "Drafting" },
          { value: "applied", label: "Applied" },
        ]}
      />
    ));
    const select = doc.querySelector("select");
    expect(select?.id).toBe("status");
    expect(doc.querySelector("label")?.getAttribute("for")).toBe("status");
    expect(
      [...(select?.querySelectorAll("option") ?? [])].map((o) => [o.value, o.selected])
    ).toEqual([
      ["drafting", false],
      ["applied", true],
    ]);
  });
});

describe("StatusBadge", () => {
  it("shows the word for each of the four statuses", () => {
    const words = STATUSES.map(
      (status) => renderHtml(() => <StatusBadge status={status} />).body.textContent
    );
    expect(words).toEqual(["Drafting", "Applied", "Interviewing", "Closed"]);
  });
});

describe("StatusTag, OutcomeTag and OfferTag", () => {
  it("names the four statuses, the outcomes and an offer in words", () => {
    const words = (code: () => JSX.Element) => renderHtml(code).body.textContent;
    expect(BOARD_STATUSES.map((status) => words(() => <StatusTag status={status} />))).toEqual([
      "Drafting",
      "Applied",
      "Interviewing",
      "Closed",
    ]);
    expect(OUTCOMES.map((outcome) => words(() => <OutcomeTag outcome={outcome} />))).toEqual([
      "Accepted",
      "Declined",
      "Rejected",
      "Withdrawn",
    ]);
    expect(words(() => <OfferTag />)).toBe("Offer");
  });
});

describe("Segmented, Switch and SideNav", () => {
  it("builds a segmented control from radio buttons", () => {
    const doc = renderHtml(() => (
      <Segmented
        label="Theme"
        value="dark"
        onChange={() => {}}
        options={[
          { value: "system", label: "System" },
          { value: "dark", label: "Dark" },
        ]}
      />
    ));
    expect(doc.querySelector('[role="radiogroup"]')?.getAttribute("aria-label")).toBe("Theme");
    expect([...doc.querySelectorAll("input")].map((i) => [i.type, i.checked])).toEqual([
      ["radio", false],
      ["radio", true],
    ]);
  });

  it("gives a switch the switch role", () => {
    const input = renderHtml(() => <Switch label="Tighten" checked />).querySelector("input");
    expect(input?.getAttribute("role")).toBe("switch");
    expect(input?.checked).toBe(true);
  });

  it("marks the current side-nav item, and only it", () => {
    const doc = renderHtml(() => (
      <SideNav
        label="Settings"
        current="#agents"
        items={[
          { href: "#general", label: "General" },
          { href: "#agents", label: "Agents", count: 2 },
        ]}
      />
    ));
    expect(doc.querySelector("nav")?.getAttribute("aria-label")).toBe("Settings");
    expect([...doc.querySelectorAll("a")].map((a) => a.getAttribute("aria-current"))).toEqual([
      "false",
      "page",
    ]);
  });
});
