import { EMPTY_RESUME, normalizeResume, type ResumeSchema } from "@tailory/core";
import { describe, expect, it } from "vitest";

import { countItems, editProfile, ProfileEditError } from "./profile-edit";

const base = (): ResumeSchema =>
  normalizeResume({
    ...structuredClone(EMPTY_RESUME),
    basics: { ...structuredClone(EMPTY_RESUME).basics, name: "Ada", location: { city: "London" } },
    work: [
      {
        id: "w1",
        name: "Acme",
        position: "Engineer",
        highlights: [
          { id: "b1", text: "Built it" },
          { id: "b2", text: "Ran it" },
        ],
      },
    ],
    skills: [{ id: "s1", name: "Go" }],
  });

describe("editProfile", () => {
  it("replaces the whole profile from a JSON Resume, giving everything ids", () => {
    const { resume } = editProfile(base(), {
      replace: { basics: { name: "Grace" }, work: [{ name: "Navy", highlights: ["COBOL"] }] },
    });
    expect(resume.basics.name).toBe("Grace");
    expect(resume.skills).toEqual([]);
    expect(resume.work?.[0]?.id).toEqual(expect.any(String));
    expect(resume.work?.[0]?.highlights?.[0]).toEqual({ id: expect.any(String), text: "COBOL" });
  });

  it("refuses a replacement that isn't a resume", () => {
    expect(() => editProfile(base(), { replace: { work: "nope" } })).toThrow(ProfileEditError);
  });

  it("merges basics, location included", () => {
    const { resume } = editProfile(base(), {
      basics: { label: "Engineer", location: { region: "England" }, profiles: [] },
    });
    expect(resume.basics).toMatchObject({
      name: "Ada",
      label: "Engineer",
      location: { city: "London", region: "England" },
    });
  });

  it("adds entries and bullets and returns their ids", () => {
    const { resume, added } = editProfile(base(), {
      add: [
        { section: "projects", entry: { id: "ignored", name: "Tailory", highlights: ["Shipped"] } },
        { entryId: "w1", bullet: "Hired the team" },
      ],
    });
    expect(added).toHaveLength(2);
    expect(resume.projects?.[0]?.id).toBe(added[0]);
    expect(resume.projects?.[0]?.id).not.toBe("ignored");
    expect(resume.work?.[0]?.highlights?.at(-1)).toEqual({ id: added[1], text: "Hired the team" });
  });

  it("refuses empty additions and bullets where there are none", () => {
    expect(() => editProfile(base(), { add: [{ section: "skills", entry: {} }] })).toThrow("empty");
    expect(() => editProfile(base(), { add: [{ entryId: "w1", bullet: "  " }] })).toThrow(
      "needs some text"
    );
    expect(() => editProfile(base(), { add: [{ entryId: "s1", bullet: "x" }] })).toThrow(
      "no bullets"
    );
    expect(() => editProfile(base(), { add: [{ entryId: "b1", bullet: "x" }] })).toThrow('id "b1"');
  });

  it("changes entries and bullets by id, keeping their ids", () => {
    const { resume } = editProfile(base(), {
      change: [
        { id: "w1", fields: { position: "Lead" } },
        { id: "b2", fields: { text: "Ran it well" } },
      ],
    });
    expect(resume.work?.[0]).toMatchObject({ id: "w1", position: "Lead" });
    expect(resume.work?.[0]?.highlights?.[1]).toEqual({ id: "b2", text: "Ran it well" });
  });

  it("refuses changes it can't make", () => {
    const attempts = [
      { id: "nope", fields: {} },
      { id: "basics", fields: { name: "x" } },
      { id: "w1", fields: { highlights: [] } },
      { id: "b1", fields: { text: "x", extra: 1 } },
    ];
    for (const change of attempts) {
      expect(() => editProfile(base(), { change: [change] })).toThrow(ProfileEditError);
    }
  });

  it("removes entries and bullets, and refuses unknown ids", () => {
    const { resume } = editProfile(base(), { remove: ["b1", "s1"] });
    expect(resume.skills).toEqual([]);
    expect(resume.work?.[0]?.highlights).toEqual([{ id: "b2", text: "Ran it" }]);
    expect(() => editProfile(base(), { remove: ["b9"] })).toThrow("get_profile");
  });

  it("counts entries and bullets", () => {
    expect(countItems(base())).toEqual({ entries: 2, bullets: 2 });
  });
});
