import { fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";

import { createDocument } from "@/lib/versions/document";
import { createVersion, loadDocument, versions } from "@/store/document";
import { setActiveVersionId } from "@/store/editor";
import { resume } from "@/store/resume";
import { EMPTY_RESUME } from "@/types/resume";
import BasicsForm from "./BasicsForm";

afterEach(() => {
  setActiveVersionId(null);
  loadDocument(createDocument(EMPTY_RESUME));
});

function openVersion() {
  const master = structuredClone(EMPTY_RESUME);
  master.basics.name = "Ada";
  master.basics.label = "Engineer";
  master.basics.location = { city: "Lisbon" };
  loadDocument(createDocument(master));
  const id = createVersion({ name: "Acme" });
  setActiveVersionId(id);
  render(() => <BasicsForm />);
  return id;
}

describe("Fields in a version", () => {
  it("rewords the headline without touching the master", () => {
    openVersion();

    fireEvent.input(screen.getByRole("textbox", { name: "Headline" }), {
      target: { value: "Frontend engineer" },
    });

    expect(resume.basics.label).toBe("Engineer");
    expect(versions[0]?.rewordings).toEqual([
      expect.objectContaining({ itemId: "basics", field: "label", text: "Frontend engineer" }),
    ]);
  });

  it("drops the rewording when the text goes back to the master's", () => {
    openVersion();
    const headline = screen.getByRole("textbox", { name: "Headline" });

    fireEvent.input(headline, { target: { value: "Frontend engineer" } });
    fireEvent.input(headline, { target: { value: "Engineer" } });

    expect(versions[0]?.rewordings).toEqual([]);
  });

  it("keeps fields that every version shares read-only, and says where to change them", () => {
    openVersion();

    const city = screen.getByRole("textbox", { name: "City" });
    expect(city).toHaveAttribute("readonly");
    expect(city).toHaveAccessibleDescription("Same in every version. Change it on Master.");
  });

  it("fills a field that is empty on the master into the master", () => {
    openVersion();
    const phone = screen.getByRole("textbox", { name: "Phone" });

    fireEvent.input(phone, { target: { value: "+1" } });
    fireEvent.input(phone, { target: { value: "+1 555" } });

    expect(resume.basics.phone).toBe("+1 555");
    expect(versions[0]?.rewordings).toEqual([]);
  });
});
