import { describe, expect, it } from "vitest";

import { normalizeDocument } from "@/lib/versions/document";
import { job, sampleDocument, sampleVersion } from "@/test/resume-document";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  exportBackupDocument,
  exportBackupString,
  isTailoryBackup,
  parseBackupDocument,
} from "./backup";

function documentWithVersions() {
  const document = sampleDocument([
    sampleVersion({
      excluded: ["work-b", "bullet-a2"],
      sectionOrder: [
        "projects",
        "summary",
        "work",
        "volunteer",
        "education",
        "awards",
        "publications",
        "skills",
        "languages",
        "interests",
        "references",
        "certificates",
      ],
      pageTarget: 2,
      rewordings: [
        { itemId: "bullet-a1", field: "text", text: "Rebuilt scheduling", baseText: "Old text" },
        { itemId: "basics", field: "label", text: "Design lead", baseText: "Product designer" },
      ],
    }),
    sampleVersion({ id: "version-blank", name: "Blank", templateId: "modern", pageTarget: null }),
  ]);
  job(document.master, 0).startDate = "March 2022";
  return document;
}

describe("Tailory backup", () => {
  it("writes the format, the version, and the whole resume", () => {
    const document = documentWithVersions();
    const backup = exportBackupDocument(document);

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.resume).toEqual(normalizeDocument(document));
  });

  it("reads back exactly what it wrote", () => {
    const document = normalizeDocument(documentWithVersions());

    const restored = parseBackupDocument(JSON.parse(exportBackupString(document)));

    expect(restored).toEqual(document);
    expect(exportBackupString(restored)).toBe(exportBackupString(document));
  });

  it("keeps ids, Tailory's dates, and the base text for 'original changed'", () => {
    const restored = parseBackupDocument(JSON.parse(exportBackupString(documentWithVersions())));

    expect(restored.master.work?.[0]).toMatchObject({ id: "work-a", startDate: "Mar 2022" });
    expect(restored.master.work?.[0]?.highlights?.[0]?.id).toBe("bullet-a1");
    expect(restored.versions[0]?.rewordings[0]?.baseText).toBe("Old text");
  });

  it("tells a backup apart from a JSON Resume", () => {
    expect(isTailoryBackup(exportBackupDocument(documentWithVersions()))).toBe(true);
    expect(isTailoryBackup({ basics: { name: "Jane" } })).toBe(false);
    expect(isTailoryBackup(null)).toBe(false);
  });

  it("leaves out top-level fields Tailory doesn't keep", () => {
    const backup = JSON.parse(exportBackupString(documentWithVersions()));
    backup.resume.master.meta = { theme: "x" };

    expect(parseBackupDocument(backup).master).not.toHaveProperty("meta");
  });

  it("says why it can't read a file", () => {
    expect(() => parseBackupDocument({ basics: {} })).toThrow("isn't a Tailory backup");
    expect(() => parseBackupDocument({ format: BACKUP_FORMAT, version: 2 })).toThrow(
      "newer Tailory"
    );
    expect(() => parseBackupDocument({ format: BACKUP_FORMAT, version: "1" })).toThrow(
      "can't read"
    );
    expect(() => parseBackupDocument({ format: BACKUP_FORMAT, version: 1, resume: {} })).toThrow(
      "no resume"
    );
  });
});
