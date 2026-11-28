import { describe, expect, it } from "vitest";

import { sampleApplication, sampleProfile } from "../test/support.ts";
import { RESUME_SECTION_KEYS } from "../types/application.ts";
import {
  ApplicationStatusError,
  createApplication,
  isApplicationOutcome,
  isApplicationStatus,
  moveApplication,
  normalizeApplication,
  normalizePageTarget,
} from "./application.ts";

const NOW = new Date("2026-11-20T10:00:00.000Z");
const LATER = new Date("2026-11-27T10:00:00.000Z");

describe("createApplication", () => {
  it("starts a draft that keeps the whole profile", () => {
    const application = createApplication(
      {
        company: " Acme ",
        role: " Staff designer ",
        postingUrl: "https://acme.example/jobs/1",
        jobDescription: "  ",
      },
      NOW
    );

    expect(application).toEqual({
      id: expect.any(String),
      company: "Acme",
      role: "Staff designer",
      postingUrl: "https://acme.example/jobs/1",
      jobDescription: null,
      status: "drafting",
      outcome: null,
      offer: false,
      archived: false,
      createdAt: "2026-11-20T10:00:00.000Z",
      statusChangedAt: "2026-11-20T10:00:00.000Z",
      appliedAt: null,
      closedAt: null,
      notes: "",
      excluded: [],
      rewordings: [],
      sectionOrder: [...RESUME_SECTION_KEYS],
      templateId: "modern",
      pageTarget: null,
      autoFit: true,
    });
  });

  it("starts from the profile's section order", () => {
    const application = createApplication({
      company: "Acme",
      role: "Designer",
      sectionOrder: ["skills", "work"],
    });
    expect(application.sectionOrder.slice(0, 3)).toEqual(["skills", "work", "summary"]);
    expect(application.sectionOrder).toHaveLength(RESUME_SECTION_KEYS.length);
  });

  it("takes a template and a page target the user picked", () => {
    const application = createApplication(
      { company: "Acme", role: "Designer", templateId: "minimal", pageTarget: 2 },
      NOW
    );

    expect(application).toMatchObject({ templateId: "minimal", pageTarget: 2 });
  });

  it("gives each application its own id", () => {
    const details = { company: "Acme", role: "Designer" };
    expect(createApplication(details).id).not.toBe(createApplication(details).id);
  });
});

describe("moveApplication", () => {
  it("records when it was applied, once, and when the status last changed", () => {
    const applied = moveApplication(sampleApplication(), { status: "applied" }, NOW);
    const interviewing = moveApplication(applied, { status: "interviewing" }, LATER);

    expect(applied).toMatchObject({
      status: "applied",
      appliedAt: NOW.toISOString(),
      statusChangedAt: NOW.toISOString(),
    });
    expect(interviewing).toMatchObject({
      status: "interviewing",
      appliedAt: NOW.toISOString(),
      closedAt: null,
      outcome: null,
      statusChangedAt: LATER.toISOString(),
    });
  });

  it("leaves the applied date empty while drafting", () => {
    expect(moveApplication(sampleApplication(), { status: "drafting" }, NOW).appliedAt).toBeNull();
  });

  it("needs an outcome to close", () => {
    expect(() => moveApplication(sampleApplication(), { status: "closed" }, NOW)).toThrow(
      ApplicationStatusError
    );
  });

  it("records when it closed and how, and clears both when it reopens", () => {
    const rejected = moveApplication(
      sampleApplication(),
      { status: "closed", outcome: "rejected" },
      NOW
    );
    const withdrawn = moveApplication(rejected, { outcome: "withdrawn" }, LATER);
    const reopened = moveApplication(withdrawn, { status: "interviewing" }, LATER);

    expect(rejected).toMatchObject({
      status: "closed",
      outcome: "rejected",
      closedAt: NOW.toISOString(),
      appliedAt: NOW.toISOString(),
    });
    // A new outcome keeps the closing date but counts as a move.
    expect(withdrawn).toMatchObject({
      outcome: "withdrawn",
      closedAt: NOW.toISOString(),
      statusChangedAt: LATER.toISOString(),
    });
    expect(reopened).toMatchObject({ closedAt: null, outcome: null });
  });

  it("ignores an outcome while the application is open", () => {
    const moved = moveApplication(sampleApplication(), { status: "applied", outcome: "accepted" });
    expect(moved.outcome).toBeNull();
  });

  it("flags an offer while interviewing, and drops the flag on closing", () => {
    const interviewing = moveApplication(sampleApplication(), { status: "interviewing" }, NOW);
    const offer = moveApplication(interviewing, { offer: true }, LATER);
    const accepted = moveApplication(offer, { status: "closed", outcome: "accepted" }, LATER);

    expect(offer).toMatchObject({ status: "interviewing", offer: true, closedAt: null });
    // The flag alone is not a move between columns.
    expect(offer.statusChangedAt).toBe(NOW.toISOString());
    expect(accepted).toMatchObject({ offer: false, outcome: "accepted" });
  });

  it("does not count a move to the same place as a change", () => {
    const applied = moveApplication(sampleApplication(), { status: "applied" }, NOW);
    expect(moveApplication(applied, { status: "applied" }, LATER).statusChangedAt).toBe(
      NOW.toISOString()
    );
  });
});

describe("normalizeApplication", () => {
  it("keeps a valid application as it is", () => {
    const application = sampleApplication({
      excluded: ["work-b", "bullet-a1"],
      rewordings: [
        { itemId: "work-a", field: "position", text: "Lead", baseText: "Senior designer" },
      ],
    });

    expect(normalizeApplication(application, sampleProfile())).toEqual(application);
  });

  it("drops references to items and fields the profile doesn't have", () => {
    const normalized = normalizeApplication(
      sampleApplication({
        excluded: ["work-a", "gone", "basics", "work-a"],
        rewordings: [
          { itemId: "gone", field: "text", text: "x", baseText: "y" },
          { itemId: "work-a", field: "id", text: "x", baseText: "y" },
          { itemId: "bullet-a1", field: "text", text: "First", baseText: "Redesigned scheduling" },
          { itemId: "bullet-a1", field: "text", text: "Second", baseText: "Redesigned scheduling" },
        ],
      }),
      sampleProfile()
    );

    expect(normalized.excluded).toEqual(["work-a"]);
    expect(normalized.rewordings).toEqual([
      { itemId: "bullet-a1", field: "text", text: "Second", baseText: "Redesigned scheduling" },
    ]);
  });

  it("takes the profile's text as the base of a rewording without one", () => {
    const normalized = normalizeApplication(
      {
        rewordings: [{ itemId: "work-a", field: "position", text: "Lead" }, "junk", { itemId: 1 }],
      },
      sampleProfile()
    );

    expect(normalized.rewordings).toEqual([
      { itemId: "work-a", field: "position", text: "Lead", baseText: "Senior designer" },
    ]);
  });

  it("fills defaults for anything missing or of the wrong type", () => {
    const normalized = normalizeApplication(
      {
        id: " ",
        company: 3,
        status: "won",
        archived: "yes",
        createdAt: "not a date",
        appliedAt: "2026-11-02",
        notes: null,
        sectionOrder: ["skills", "nope"],
        templateId: "fancy",
        pageTarget: 1.5,
        autoFit: "no",
      },
      sampleProfile()
    );

    expect(normalized).toMatchObject({
      id: expect.any(String),
      company: "",
      role: "",
      postingUrl: null,
      jobDescription: null,
      status: "drafting",
      archived: false,
      createdAt: expect.any(String),
      appliedAt: "2026-11-02T00:00:00.000Z",
      closedAt: null,
      notes: "",
      excluded: [],
      rewordings: [],
      templateId: "modern",
      pageTarget: null,
      autoFit: true,
    });
    expect(normalized.id).not.toBe("");
    expect(Number.isNaN(Date.parse(normalized.createdAt))).toBe(false);
    expect(normalized.sectionOrder[0]).toBe("skills");
    expect(normalized.sectionOrder).toHaveLength(RESUME_SECTION_KEYS.length);
    expect(normalizeApplication(null, sampleProfile()).status).toBe("drafting");
  });

  it("gives a closed application an outcome, and an open one none", () => {
    const profile = sampleProfile();
    expect(normalizeApplication({ status: "closed" }, profile)).toMatchObject({
      outcome: "withdrawn",
      offer: false,
    });
    expect(
      normalizeApplication({ status: "closed", outcome: "accepted", offer: true }, profile)
    ).toMatchObject({ outcome: "accepted", offer: false });
    expect(
      normalizeApplication({ status: "interviewing", outcome: "accepted", offer: true }, profile)
    ).toMatchObject({ outcome: null, offer: true });
  });

  it("dates the last status change from creation when it has none", () => {
    const normalized = normalizeApplication(
      { createdAt: "2026-11-02T00:00:00.000Z" },
      sampleProfile()
    );
    expect(normalized.statusChangedAt).toBe("2026-11-02T00:00:00.000Z");
  });

  it("keeps contact details and the summary it leaves out", () => {
    const profile = sampleProfile();
    profile.basics.profiles = [{ id: "link-a", network: "GitHub", username: "jane", url: "" }];
    const normalized = normalizeApplication(
      {
        excluded: [
          "contact:email",
          "contact:profile:link-a",
          "contact:profile:gone",
          "basics:summary",
          "contact:fax",
        ],
      },
      profile
    );
    expect(normalized.excluded).toEqual([
      "contact:email",
      "contact:profile:link-a",
      "basics:summary",
    ]);
  });

  it("only turns tightening off when told to", () => {
    expect(normalizeApplication({ autoFit: false }, sampleProfile()).autoFit).toBe(false);
  });
});

describe("helpers", () => {
  it("accepts whole page counts from one up", () => {
    expect(normalizePageTarget(1)).toBe(1);
    expect(normalizePageTarget(3)).toBe(3);
    expect(normalizePageTarget(0)).toBeNull();
    expect(normalizePageTarget("2")).toBeNull();
  });

  it("knows the statuses and outcomes", () => {
    expect(isApplicationStatus("closed")).toBe(true);
    expect(isApplicationStatus("offer")).toBe(false);
    expect(isApplicationOutcome("declined")).toBe(true);
    expect(isApplicationOutcome("closed")).toBe(false);
  });
});
