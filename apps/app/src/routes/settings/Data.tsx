import { createMemo, createSignal, Loading, Match, Switch } from "solid-js";

import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { CopyButton } from "../../components/CopyButton";
import { toast } from "../../lib/toast";
import { eraseAllData, exportAllData } from "../../server/functions";
import { getDataInfo } from "../../server/settings-functions";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Saves `data` as a JSON file through the browser's download. */
export function saveJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Data() {
  const info = createMemo(() => getDataInfo());
  const [exporting, setExporting] = createSignal(false);
  const [erasing, setErasing] = createSignal(false);

  const exportEverything = async () => {
    setExporting(true);
    try {
      const file = await exportAllData();
      saveJson(file.fileName, file.data);
    } catch {
      toast("Couldn't export. Try again.", {
        tone: "error",
        action: { label: "Retry", run: () => void exportEverything() },
      });
    } finally {
      setExporting(false);
    }
  };

  const erase = async () => {
    try {
      await eraseAllData();
    } catch {
      throw new Error("Couldn't erase your data. Try again.");
    }
    // A fresh page load, so nothing on screen still shows what was erased.
    window.location.assign("/");
  };

  const server = () => info().mode === "server";
  const folder = () => {
    const location = info().location;
    return location.kind === "folder" ? location.path : undefined;
  };
  const what = () => {
    const count = info().applications;
    return count === 0 ? "your profile" : `your profile and ${plural(count, "application")}`;
  };

  return (
    <>
      <h2 class="settings__title">Data</h2>
      <Loading fallback={<p class="loading-note">Loading…</p>}>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row__text">
              <Switch>
                <Match when={server()}>
                  <span class="settings-row__name">Stored on the server</span>
                  <span class="settings-row__desc">In this Tailory's hosted database.</span>
                </Match>
                <Match when={!folder()}>
                  <span class="settings-row__name">Stored in your database</span>
                  <span class="settings-row__desc">
                    The Postgres database Tailory was started with.
                  </span>
                </Match>
                <Match when={folder()}>
                  {(path) => (
                    <>
                      <span class="settings-row__name">Stored on this computer</span>
                      <span class="settings-path">
                        <code translate="no">{path()}</code>
                        <CopyButton text={path()} label="Copy the folder path" />
                      </span>
                    </>
                  )}
                </Match>
              </Switch>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row__text">
              <span class="settings-row__name">Export everything</span>
              <span class="settings-row__desc">
                Your profile and every application, in one JSON file.
              </span>
            </div>
            <Button busy={exporting()} onClick={() => void exportEverything()}>
              Export
            </Button>
          </div>
          <div class="settings-row settings-row--danger">
            <div class="settings-row__text">
              <span class="settings-row__name">Erase all data</span>
              <span class="settings-row__desc">
                {server()
                  ? "Deletes your profile, applications and account from the server."
                  : "Deletes your profile and applications from this computer."}
              </span>
            </div>
            <Button variant="danger" onClick={() => setErasing(true)}>
              Erase…
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={erasing()}
          onClose={() => setErasing(false)}
          title="Erase all data?"
          word="erase"
          action="Erase everything"
          onConfirm={erase}
        >
          <p>
            This deletes {what()}
            {server() ? ", and your account," : ""} for good. Export first if you might want them
            back.
          </p>
        </ConfirmDialog>
      </Loading>
    </>
  );
}
