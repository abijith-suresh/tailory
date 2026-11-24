import { createSignal } from "solid-js";

import { announce } from "@/components/ui/announcer";
import { primaryButton } from "@/components/ui/buttons";
import { ChevronDown } from "@/components/ui/icons";
import Menu from "@/components/ui/Menu";
import { versions } from "@/store/document";
import { activeVersion } from "@/store/editor";
import { setActiveSection, setExportError } from "@/store/resume";
import { exportBackup, exportShownJson, exportShownPdf } from "./export-actions";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Export the open version as a PDF or JSON Resume, or everything as a backup. */
export default function ExportMenu() {
  const [busy, setBusy] = createSignal(false);
  const shownName = () => (activeVersion() ? "this version" : "Master");

  const run = async (action: () => void | Promise<void>, done: string, fallback: string) => {
    setExportError("");
    setBusy(true);
    try {
      await action();
      announce(done);
    } catch (error) {
      const message = errorMessage(error, fallback);
      setExportError(message);
      // Take the user to the field the export needs.
      if (/name/i.test(message)) setActiveSection("basics");
    } finally {
      setBusy(false);
    }
  };

  const backupDetail = () => {
    const count = versions.length;
    if (count === 0) return "Master, to import into Tailory later";
    return `Master and ${count === 1 ? "1 version" : `all ${count} versions`}, to import later`;
  };

  return (
    <Menu
      ariaLabel="Export"
      triggerClass={`${primaryButton} gap-1.5`}
      triggerProps={{ disabled: busy(), "aria-busy": busy() }}
      label={
        <>
          {busy() ? "Exporting…" : "Export"}
          <ChevronDown />
        </>
      }
      items={[
        {
          label: `PDF of ${shownName()}`,
          detail: "Text PDF, ready to send",
          onSelect: () =>
            void run(exportShownPdf, "PDF exported.", "Couldn't export the PDF. Try again."),
        },
        {
          label: `JSON Resume of ${shownName()}`,
          detail: "Standard format other tools can read",
          onSelect: () =>
            void run(exportShownJson, "JSON exported.", "Couldn't export JSON. Try again."),
        },
        {
          label: "Backup",
          detail: backupDetail(),
          onSelect: () =>
            void run(exportBackup, "Backup exported.", "Couldn't export the backup. Try again."),
        },
      ]}
    />
  );
}
