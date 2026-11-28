import { describe, expect, it } from "vitest";

import { exportJsonResumeDocument } from "../resume/json.ts";
import { normalizeResume } from "../resume/normalize.ts";
import { bullet, job, sampleApplication, sampleProfile } from "../test/support.ts";
import { findRewording, isRewordingStale, resolveApplication, sameText } from "./resolve.ts";

function reworded(itemId: string, field: string, text: string, baseText: string) {
  return { itemId, field, text, baseText };
}

describe("resolveApplication", () => {
  it("gives everything in the profile for an application that leaves nothing out", () => {
    expect(resolveApplication(sampleProfile(), sampleApplication())).toEqual({
      resume: normalizeResume(sampleProfile()),
      staleRewordings: [],
    });
  });

  it("leaves out excluded entries and bullets", () => {
    const { resume } = resolveApplication(
      sampleProfile(),
      sampleApplication({ excluded: ["work-b", "bullet-a2", "bullet-p1", "skill-a"] })
    );

    expect(resume.work?.map((entry) => entry.id)).toEqual(["work-a"]);
    expect(resume.work?.[0]?.highlights).toEqual([
      { id: "bullet-a1", text: "Redesigned scheduling" },
    ]);
    expect(resume.projects?.[0]?.highlights).toEqual([]);
    expect(resume.skills).toEqual([]);
  });

  it("uses the application's wording for bullets, entry fields, and the fields under the name", () => {
    const { resume } = resolveApplication(
      sampleProfile(),
      sampleApplication({
        rewordings: [
          reworded(
            "bullet-a1",
            "text",
            "Rebuilt scheduling for field teams",
            "Redesigned scheduling"
          ),
          reworded("work-a", "position", "Design lead", "Senior designer"),
          reworded("project-a", "description", "Scheduling case studies.", "Case studies."),
          reworded("basics", "label", "Staff product designer", "Product designer"),
          reworded(
            "basics",
            "summary",
            "Designs tools for field teams.",
            "Designs scheduling tools."
          ),
        ],
      })
    );

    expect(resume.basics.label).toBe("Staff product designer");
    expect(resume.basics.summary).toBe("Designs tools for field teams.");
    expect(resume.work?.[0]?.position).toBe("Design lead");
    expect(resume.work?.[0]?.highlights?.[0]?.text).toBe("Rebuilt scheduling for field teams");
    expect(resume.projects?.[0]?.description).toBe("Scheduling case studies.");
  });

  it("keeps the application's wording after the profile changes, and flags it as stale", () => {
    const profile = sampleProfile();
    const rewording = reworded("work-a", "position", "Design lead", "Senior designer");
    job(profile, 0).position = "Principal designer";
    job(profile, 0).name = "Fieldnote Inc.";
    bullet(profile, 0, 1).text = "Built and ran the design system";

    const resolved = resolveApplication(profile, sampleApplication({ rewordings: [rewording] }));

    expect(resolved.resume.work?.[0]).toMatchObject({
      position: "Design lead",
      name: "Fieldnote Inc.",
    });
    expect(resolved.resume.work?.[0]?.highlights?.[1]?.text).toBe(
      "Built and ran the design system"
    );
    expect(resolved.staleRewordings).toEqual([rewording]);
  });

  it("flags only the rewordings whose profile text changed", () => {
    const profile = sampleProfile();
    const current = reworded(
      "bullet-a2",
      "text",
      "Built a design system",
      "Built the design system"
    );
    const changed = reworded("bullet-a1", "text", "Rebuilt scheduling", "Redesigned scheduling");
    bullet(profile, 0, 0).text = "Redesigned scheduling for 4,000 teams";

    const { staleRewordings } = resolveApplication(
      profile,
      sampleApplication({ rewordings: [current, changed] })
    );

    expect(staleRewordings).toEqual([changed]);
  });

  it("leaves out the contact details and summary it lists, links by their id", () => {
    const profile = sampleProfile();
    profile.basics = {
      ...profile.basics,
      email: "jane@example.com",
      phone: "555 0100",
      url: "https://jane.example",
      location: { city: "Leeds", countryCode: "GB" },
      profiles: [
        { id: "link-gh", network: "GitHub", username: "jane", url: "https://github.com/jane" },
        {
          id: "link-in",
          network: "LinkedIn",
          username: "jane",
          url: "https://linkedin.com/in/jane",
        },
      ],
    };
    const { resume } = resolveApplication(
      profile,
      sampleApplication({
        excluded: [
          "contact:phone",
          "contact:location",
          "contact:profile:link-gh",
          "basics:summary",
        ],
      })
    );
    expect(resume.basics).toMatchObject({
      email: "jane@example.com",
      phone: "",
      url: "https://jane.example",
      summary: "",
    });
    expect(resume.basics.location?.city ?? "").toBe("");
    expect(resume.basics.profiles?.map((link) => link.id)).toEqual(["link-in"]);

    const all = resolveApplication(
      profile,
      sampleApplication({ excluded: ["contact:email", "contact:url"] })
    );
    expect(all.resume.basics).toMatchObject({ email: "", phone: "555 0100" });
    expect(all.resume.basics.url).toBeUndefined();
    expect(all.resume.basics.profiles).toHaveLength(2);
  });

  it("ignores wording for fields an application can't reword", () => {
    const { resume } = resolveApplication(
      sampleProfile(),
      sampleApplication({ rewordings: [reworded("work-a", "id", "other", "work-a")] })
    );

    expect(resume.work?.[0]?.id).toBe("work-a");
  });

  it("does not change the profile or the application", () => {
    const profile = sampleProfile();
    const application = sampleApplication({
      excluded: ["bullet-a1"],
      rewordings: [reworded("work-a", "position", "Design lead", "Senior designer")],
    });
    const before = structuredClone({ profile, application });

    resolveApplication(profile, application);

    expect({ profile, application }).toEqual(before);
  });

  it("exports as standard JSON Resume, with plain-string bullets and no ids", () => {
    const { resume } = resolveApplication(
      sampleProfile(),
      sampleApplication({
        excluded: ["work-b", "bullet-a2"],
        rewordings: [reworded("bullet-a1", "text", "Rebuilt scheduling", "Redesigned scheduling")],
      })
    );

    const exported = exportJsonResumeDocument(resume);

    expect(exported.work).toEqual([
      {
        name: "Fieldnote",
        position: "Senior designer",
        summary: "Leads design.",
        highlights: ["Rebuilt scheduling"],
      },
    ]);
    expect(JSON.stringify(exported)).not.toContain('"id"');
  });
});

describe("rewording helpers", () => {
  it("finds an application's wording for a field", () => {
    const rewording = reworded("work-a", "position", "Design lead", "Senior designer");
    const application = sampleApplication({ rewordings: [rewording] });

    expect(findRewording(application, "work-a", "position")).toEqual(rewording);
    expect(findRewording(application, "work-a", "name")).toBeUndefined();
  });

  it("flags a rewording once the profile text it replaced changes", () => {
    const profile = sampleProfile();
    const rewording = reworded("bullet-a1", "text", "Rebuilt scheduling", "Redesigned scheduling");

    expect(isRewordingStale(profile, rewording)).toBe(false);

    bullet(profile, 0, 0).text = "Redesigned scheduling for 4,000 teams";
    expect(isRewordingStale(profile, rewording)).toBe(true);
  });

  it("does not flag spacing-only changes or rewordings of deleted items", () => {
    const profile = sampleProfile();

    expect(
      isRewordingStale(profile, reworded("basics", "label", "Lead", "  Product   designer "))
    ).toBe(false);
    expect(isRewordingStale(profile, reworded("gone", "text", "New", "Old"))).toBe(false);
    expect(sameText(" a  b ", "a b")).toBe(true);
  });

  it("treats a missing profile field as empty text", () => {
    const profile = sampleProfile();
    const rewording = reworded("work-b", "summary", "Ran research.", "");

    expect(isRewordingStale(profile, rewording)).toBe(false);
    job(profile, 1).summary = "Research and prototypes.";
    expect(isRewordingStale(profile, rewording)).toBe(true);
  });
});
