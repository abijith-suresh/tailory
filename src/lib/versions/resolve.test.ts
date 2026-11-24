import { describe, expect, it } from "vitest";

import { exportJsonResumeDocument } from "@/lib/resume/json";
import { normalizeResume } from "@/lib/resume/normalize";
import { bullet, job, sampleDocument, sampleMaster, sampleVersion } from "@/test/resume-document";
import { findRewording, isOriginalChanged, resolveVersion } from "./resolve";

function reworded(itemId: string, field: string, text: string, baseText: string) {
  return { itemId, field, text, baseText };
}

describe("resolveVersion", () => {
  it("gives the master when no version is asked for", () => {
    const document = sampleDocument([sampleVersion({ excluded: ["work-a"] })]);

    expect(resolveVersion(document, null)).toEqual(normalizeResume(sampleMaster()));
  });

  it("gives everything in the master for a version that leaves nothing out", () => {
    expect(resolveVersion(sampleDocument(), "version-acme")).toEqual(
      normalizeResume(sampleMaster())
    );
  });

  it("leaves out excluded entries and bullets", () => {
    const document = sampleDocument([
      sampleVersion({ excluded: ["work-b", "bullet-a2", "bullet-p1", "skill-a"] }),
    ]);

    const resolved = resolveVersion(document, "version-acme");

    expect(resolved.work?.map((entry) => entry.id)).toEqual(["work-a"]);
    expect(resolved.work?.[0]?.highlights).toEqual([
      { id: "bullet-a1", text: "Redesigned scheduling" },
    ]);
    expect(resolved.projects?.[0]?.highlights).toEqual([]);
    expect(resolved.skills).toEqual([]);
  });

  it("uses a version's wording for bullets, entry fields, and the fields under the name", () => {
    const document = sampleDocument([
      sampleVersion({
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
          reworded("basics", "summary", "Designs tools for field teams.", "Designs scheduling."),
        ],
      }),
    ]);

    const resolved = resolveVersion(document, "version-acme");

    expect(resolved.basics.label).toBe("Staff product designer");
    expect(resolved.basics.summary).toBe("Designs tools for field teams.");
    expect(resolved.work?.[0]?.position).toBe("Design lead");
    expect(resolved.work?.[0]?.highlights?.[0]?.text).toBe("Rebuilt scheduling for field teams");
    expect(resolved.projects?.[0]?.description).toBe("Scheduling case studies.");
  });

  it("keeps the version's wording after the master changes, and takes other master edits", () => {
    const document = sampleDocument([
      sampleVersion({
        rewordings: [reworded("work-a", "position", "Design lead", "Senior designer")],
      }),
    ]);
    job(document.master, 0).position = "Principal designer";
    job(document.master, 0).name = "Fieldnote Inc.";
    bullet(document.master, 0, 1).text = "Built and ran the design system";

    const resolved = resolveVersion(document, "version-acme");

    expect(resolved.work?.[0]).toMatchObject({
      position: "Design lead",
      name: "Fieldnote Inc.",
    });
    expect(resolved.work?.[0]?.highlights?.[1]?.text).toBe("Built and ran the design system");
  });

  it("ignores wording for fields a version can't reword", () => {
    const document = sampleDocument([
      sampleVersion({ rewordings: [reworded("work-a", "id", "other", "work-a")] }),
    ]);

    expect(resolveVersion(document, "version-acme").work?.[0]?.id).toBe("work-a");
  });

  it("does not change the document", () => {
    const document = sampleDocument([
      sampleVersion({
        excluded: ["bullet-a1"],
        rewordings: [reworded("work-a", "position", "Design lead", "Senior designer")],
      }),
    ]);
    const before = structuredClone(document);

    resolveVersion(document, "version-acme");

    expect(document).toEqual(before);
  });

  it("refuses a version that doesn't exist", () => {
    expect(() => resolveVersion(sampleDocument(), "missing")).toThrow(/no version/);
  });

  it("exports a version as standard JSON Resume, with plain-string bullets and no ids", () => {
    const document = sampleDocument([
      sampleVersion({
        excluded: ["work-b", "bullet-a2"],
        rewordings: [reworded("bullet-a1", "text", "Rebuilt scheduling", "Redesigned scheduling")],
      }),
    ]);

    const exported = exportJsonResumeDocument(resolveVersion(document, "version-acme"));

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
  it("finds a version's wording for a field", () => {
    const rewording = reworded("work-a", "position", "Design lead", "Senior designer");
    const version = sampleVersion({ rewordings: [rewording] });

    expect(findRewording(version, "work-a", "position")).toEqual(rewording);
    expect(findRewording(version, "work-a", "name")).toBeUndefined();
  });

  it("flags a rewording once the master text it replaced changes", () => {
    const master = sampleMaster();
    const rewording = reworded("bullet-a1", "text", "Rebuilt scheduling", "Redesigned scheduling");

    expect(isOriginalChanged(master, rewording)).toBe(false);

    bullet(master, 0, 0).text = "Redesigned scheduling for 4,000 teams";
    expect(isOriginalChanged(master, rewording)).toBe(true);
  });

  it("does not flag spacing-only changes or rewordings of deleted items", () => {
    const master = sampleMaster();

    expect(
      isOriginalChanged(master, reworded("basics", "label", "Lead", "  Product   designer "))
    ).toBe(false);
    expect(isOriginalChanged(master, reworded("gone", "text", "New", "Old"))).toBe(false);
  });

  it("treats a missing master field as empty text", () => {
    const master = sampleMaster();
    const rewording = reworded("work-b", "summary", "Ran research.", "");

    expect(isOriginalChanged(master, rewording)).toBe(false);
    job(master, 1).summary = "Research and prototypes.";
    expect(isOriginalChanged(master, rewording)).toBe(true);
  });
});
