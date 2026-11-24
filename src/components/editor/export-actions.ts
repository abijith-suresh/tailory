import { downloadBlob, sanitizeFilenameBase } from "@/lib/export/download";
import { exportPDF } from "@/lib/export/pdf-export";
import { exportBackupString } from "@/lib/resume/backup";
import { exportJsonResumeString } from "@/lib/resume/json";
import { resolveVersion } from "@/lib/versions/resolve";
import { currentDocument } from "@/store/document";
import { activeVersion, currentTemplate } from "@/store/editor";
import { shownPageFit } from "@/store/fit";
import { resume, selectedAccentColor } from "@/store/resume";
import type { ResumeSchema } from "@/types/resume";

/** A plain copy of the open version's resume, outside the store. */
function shownResume(): ResumeSchema {
  const document = JSON.parse(JSON.stringify(currentDocument()));
  return resolveVersion(document, activeVersion()?.id ?? null);
}

function filenameBase(): string {
  const name = sanitizeFilenameBase(resume.basics.name);
  const version = activeVersion();
  return version ? `${name}_${sanitizeFilenameBase(version.name)}` : name;
}

/** The open version, or the master, as a PDF. */
export async function exportShownPdf() {
  await exportPDF(shownResume(), currentTemplate(), {
    accentColor: selectedAccentColor(),
    sectionOrder: activeVersion()?.sectionOrder,
    pageFit: { ...shownPageFit() },
    versionName: activeVersion()?.name,
  });
}

/** The open version, or the master, as a JSON Resume file. */
export function exportShownJson() {
  const contents = exportJsonResumeString(shownResume());
  downloadBlob(new Blob([contents], { type: "application/json" }), `${filenameBase()}.json`);
}

/** The master and every version, in a file Tailory can import again. */
export function exportBackup() {
  const contents = exportBackupString(JSON.parse(JSON.stringify(currentDocument())));
  const name = sanitizeFilenameBase(resume.basics.name);
  downloadBlob(new Blob([contents], { type: "application/json" }), `${name}_tailory-backup.json`);
}
