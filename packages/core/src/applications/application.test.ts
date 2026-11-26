import { describe, expect, it } from "vitest";

import { sampleApplication, sampleProfile } from "../test/support.ts";
import { RESUME_SECTION_KEYS } from "../types/application.ts";
import {
  createApplication,
  isApplicationStatus,
  normalizeApplication,
  normalizePageTarget,
  setApplicationStatus,
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
      archived: false,
      createdAt: "2026-11-20T10:00:00.000Z",
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

describe("setApplicationStatus", () => {
  it("records when it was applied, once", () => {
    const applied = setApplicationStatus(sampleApplication(), "applied", NOW);
    const interviewing = setApplicationStatus(applied, "interviewing", LATER);

    expect(applied).toMatchObject({ status: "applied", appliedAt: NOW.toISOString() });
    expect(interviewing).toMatchObject({
      status: "interviewing",
      appliedAt: NOW.toISOString(),
      closedAt: null,
    });
  });

  it("leaves the applied date empty while drafting", () => {
    expect(setApplicationStatus(sampleApplication(), "drafting", NOW).appliedAt).toBeNull();
  });

  it("records when it closed, and clears that when it reopens", () => {
    const rejected = setApplicationStatus(sampleApplication(), "rejected", NOW);
    const withdrawn = setApplicationStatus(rejected, "withdrawn", LATER);
    const reopened = setApplicationStatus(withdrawn, "interviewing", LATER);

    expect(rejected).toMatchObject({ closedAt: NOW.toISOString(), appliedAt: NOW.toISOString() });
    expect(withdrawn.closedAt).toBe(NOW.toISOString());
    expect(reopened.closedAt).toBeNull();
  });

  it("does not close an application with an offer", () => {
    expect(setApplicationStatus(sampleApplication(), "offer", NOW).closedAt).toBeNull();
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

  it("knows the statuses", () => {
    expect(isApplicationStatus("offer")).toBe(true);
    expect(isApplicationStatus("won")).toBe(false);
  });
});
