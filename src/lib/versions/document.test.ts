import { describe, expect, it } from "vitest";

import { bullet, sampleDocument, sampleMaster, sampleVersion } from "@/test/resume-document";
import { RESUME_SECTION_KEYS } from "@/types/document";
import {
  createDocument,
  createVersion,
  normalizeDocument,
  normalizePageTarget,
  serializeDocument,
} from "./document";

describe("createVersion", () => {
  it("starts with everything kept, the default order, and no page target", () => {
    const version = createVersion({ name: "  Acme  ", jobTitle: " Designer ", company: "" });

    expect(version).toEqual({
      id: expect.any(String),
      name: "Acme",
      jobTitle: "Designer",
      excluded: [],
      sectionOrder: [...RESUME_SECTION_KEYS],
      templateId: "modern",
      pageTarget: null,
      autoFit: true,
      rewordings: [],
    });
  });

  it("names a version with no name and uses the template it is given", () => {
    const version = createVersion({ name: " ", templateId: "compact-ats" });

    expect(version.name).toBe("Untitled version");
    expect(version.templateId).toBe("compact-ats");
  });

  it("gives each version its own id", () => {
    expect(createVersion({ name: "A" }).id).not.toBe(createVersion({ name: "A" }).id);
  });
});

describe("normalizeDocument", () => {
  it("keeps a valid document as it is", () => {
    const document = sampleDocument([
      sampleVersion({
        excluded: ["work-b", "bullet-a2"],
        rewordings: [
          { itemId: "work-a", field: "position", text: "Lead", baseText: "Senior designer" },
        ],
      }),
    ]);

    expect(normalizeDocument(document)).toEqual({
      master: createDocument(sampleMaster()).master,
      versions: document.versions,
      masterFit: { pageTarget: null, autoFit: true },
    });
  });

  it("drops references to entries and bullets the master no longer has", () => {
    const document = sampleDocument([
      sampleVersion({
        excluded: ["work-b", "bullet-b1", "bullet-a2"],
        rewordings: [
          { itemId: "bullet-b1", field: "text", text: "New", baseText: "Ran customer interviews" },
          { itemId: "work-b", field: "position", text: "Lead", baseText: "Designer" },
          { itemId: "bullet-a1", field: "text", text: "Kept", baseText: "Redesigned scheduling" },
        ],
      }),
    ]);
    document.master.work = document.master.work?.filter((entry) => entry.id !== "work-b");

    const [version] = normalizeDocument(document).versions;

    expect(version?.excluded).toEqual(["bullet-a2"]);
    expect(version?.rewordings.map((rewording) => rewording.itemId)).toEqual(["bullet-a1"]);
  });

  it("drops references to bullets that normalizing empties out", () => {
    const document = sampleDocument([sampleVersion({ excluded: ["bullet-b1"] })]);
    bullet(document.master, 1, 0).text = "   ";

    expect(normalizeDocument(document).versions[0]?.excluded).toEqual([]);
  });

  it("drops rewordings of fields a version can't reword, and repeated ones", () => {
    const document = sampleDocument([
      sampleVersion({
        excluded: ["basics", "basics", "work-a", "work-a"],
        rewordings: [
          { itemId: "work-a", field: "id", text: "x", baseText: "work-a" },
          { itemId: "work-a", field: "highlights", text: "x", baseText: "" },
          { itemId: "work-a", field: "position", text: "First", baseText: "Senior designer" },
          { itemId: "work-a", field: "position", text: "Second", baseText: "Senior designer" },
        ],
      }),
    ]);

    const [version] = normalizeDocument(document).versions;

    expect(version?.excluded).toEqual(["work-a"]);
    expect(version?.rewordings).toEqual([
      { itemId: "work-a", field: "position", text: "Second", baseText: "Senior designer" },
    ]);
  });

  it("repairs a version's settings", () => {
    const [version] = normalizeDocument({
      master: sampleMaster(),
      versions: [
        {
          id: "v1",
          name: "  ",
          jobTitle: "  ",
          sectionOrder: ["projects", "nope", "projects", "work"],
          templateId: "fancy",
          pageTarget: 0,
          excluded: "work-a",
          rewordings: [{ itemId: "work-a", field: "position", text: "Lead" }],
        },
      ],
    }).versions;

    expect(version).toEqual({
      id: "v1",
      name: "Untitled version",
      excluded: [],
      sectionOrder: [
        "projects",
        "work",
        ...RESUME_SECTION_KEYS.filter((key) => key !== "projects" && key !== "work"),
      ],
      templateId: "modern",
      pageTarget: null,
      autoFit: true,
      rewordings: [
        { itemId: "work-a", field: "position", text: "Lead", baseText: "Senior designer" },
      ],
    });
  });

  it("drops versions that aren't objects and repeated version ids", () => {
    const document = normalizeDocument({
      master: sampleMaster(),
      versions: [sampleVersion(), "junk", null, sampleVersion({ name: "Duplicate" })],
    });

    expect(document.versions.map((version) => version.name)).toEqual(["Acme"]);
  });

  it("gives an empty resume for something that isn't a document", () => {
    expect(normalizeDocument(null)).toEqual(normalizeDocument({ versions: [] }));
    expect(normalizeDocument(null).master.basics.name).toBe("");
  });

  it("serializes the same document the same way twice", () => {
    const document = sampleDocument();

    expect(serializeDocument(document)).toBe(serializeDocument(normalizeDocument(document)));
  });
});

describe("normalizePageTarget", () => {
  it("accepts whole numbers of one page or more, with no upper limit", () => {
    expect(normalizePageTarget(1)).toBe(1);
    expect(normalizePageTarget(2)).toBe(2);
    expect(normalizePageTarget(12)).toBe(12);
  });

  it("treats anything else as no target", () => {
    for (const value of [0, -1, 1.5, Number.NaN, "1", null, undefined]) {
      expect(normalizePageTarget(value)).toBeNull();
    }
  });
});
