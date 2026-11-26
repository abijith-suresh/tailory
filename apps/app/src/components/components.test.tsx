import { describe, expect, it } from "vitest";

import { Button } from "./Button";
import { Field } from "./Field";
import { renderHtml } from "./render.testing";
import { Select } from "./Select";
import { STATUSES, StatusBadge } from "./StatusBadge";

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
});

describe("Field", () => {
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
  it("shows the word for each of the six statuses", () => {
    const words = STATUSES.map(
      (status) => renderHtml(() => <StatusBadge status={status} />).body.textContent
    );
    expect(words).toEqual([
      "Drafting",
      "Applied",
      "Interviewing",
      "Offer",
      "Rejected",
      "Withdrawn",
    ]);
  });
});
