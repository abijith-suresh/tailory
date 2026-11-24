import { createEffect, For, Show } from "solid-js";

import { announce } from "@/components/ui/announcer";
import { iconButton } from "@/components/ui/buttons";
import { requestConfirm } from "@/components/ui/confirm";
import { More, Plus } from "@/components/ui/icons";
import Menu from "@/components/ui/Menu";
import {
  createVersion,
  deleteVersion,
  duplicateVersion,
  renameVersion,
  setVersionJob,
  versions,
} from "@/store/document";
import {
  activeVersion,
  versionDialog as dialog,
  setActiveVersionId,
  setVersionDialog as setDialog,
} from "@/store/editor";
import VersionDialog, { type VersionDetailsInput } from "./VersionDialog";

export const WORKSPACE_ID = "workspace";

export function tabId(versionId: string | null) {
  return versionId === null ? "version-tab-master" : `version-tab-${versionId}`;
}

function jobLine(version: { jobTitle?: string; company?: string }) {
  return [version.jobTitle, version.company].filter(Boolean).join(" · ");
}

/**
 * Master and one tab per version. Arrow keys, Home and End move between tabs and open the one
 * they land on. The open version's rename, duplicate and delete sit in the menu beside the tabs.
 */
export default function VersionTabs() {
  const selectedId = () => activeVersion()?.id ?? null;
  const ids = () => [null, ...versions.map((version) => version.id)];

  const select = (id: string | null, focus = false) => {
    setActiveVersionId(id);
    if (focus) document.getElementById(tabId(id))?.focus();
  };

  // Keep the open tab in view when there are more tabs than fit.
  createEffect(() => {
    const tab = document.getElementById(tabId(selectedId()));
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const list = ids();
    const index = list.indexOf(selectedId());
    const target = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: list.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(list[(target + list.length) % list.length] ?? null, true);
  };

  const create = (details: VersionDetailsInput) => {
    const id = createVersion(details);
    setDialog(null);
    select(id);
    announce(`Created ${details.name}. Untick what this job doesn't need.`);
  };

  const rename = (details: VersionDetailsInput) => {
    const version = activeVersion();
    if (!version) return;
    renameVersion(version.id, details.name);
    setVersionJob(version.id, { jobTitle: details.jobTitle, company: details.company });
    setDialog(null);
  };

  const duplicate = () => {
    const version = activeVersion();
    if (!version) return;
    const copyId = duplicateVersion(version.id);
    if (copyId) {
      select(copyId);
      announce(`Duplicated ${version.name}.`);
    }
  };

  const remove = async () => {
    const version = activeVersion();
    if (!version) return;
    const confirmed = await requestConfirm({
      title: `Delete “${version.name}”?`,
      body: "This deletes its ticks and rewording. The master and your other versions stay as they are.",
      confirmLabel: "Delete version",
      danger: true,
    });
    if (!confirmed) return;
    const index = versions.findIndex((candidate) => candidate.id === version.id);
    deleteVersion(version.id);
    // Open the tab before it, so focus lands somewhere nearby.
    select(index > 0 ? (versions[index - 1]?.id ?? null) : null, true);
    announce(`Deleted ${version.name}.`);
  };

  const tabClass =
    "h-11 shrink-0 max-w-48 truncate rounded-button px-3 text-ui-sm transition-colors md:h-9 aria-selected:bg-surface aria-selected:text-fg aria-selected:ring-1 aria-selected:ring-line-strong text-fg-muted hover:bg-selected hover:text-fg";

  return (
    <div class="flex min-w-0 items-center gap-1">
      <div
        role="tablist"
        aria-label="Versions"
        class="flex min-w-0 items-center gap-1 overflow-x-auto p-0.5 [scrollbar-width:none]"
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          role="tab"
          id={tabId(null)}
          aria-selected={selectedId() === null}
          aria-controls={WORKSPACE_ID}
          tabIndex={selectedId() === null ? 0 : -1}
          class={tabClass}
          onClick={() => select(null)}
        >
          Master
        </button>
        <For each={versions}>
          {(version) => (
            <button
              type="button"
              role="tab"
              id={tabId(version.id)}
              aria-selected={selectedId() === version.id}
              aria-controls={WORKSPACE_ID}
              tabIndex={selectedId() === version.id ? 0 : -1}
              title={jobLine(version) || undefined}
              class={tabClass}
              onClick={() => select(version.id)}
            >
              {version.name}
            </button>
          )}
        </For>
      </div>
      <Show when={activeVersion()}>
        {(version) => (
          <Menu
            ariaLabel={`Options for ${version().name}`}
            triggerClass={iconButton}
            label={<More />}
            items={[
              { label: "Rename", onSelect: () => setDialog("rename") },
              { label: "Duplicate", onSelect: duplicate },
              { label: "Delete", onSelect: () => void remove() },
            ]}
          />
        )}
      </Show>
      <button
        type="button"
        class="btn-quiet h-11 shrink-0 gap-1.5 px-3 text-ui-sm text-primary max-[22.5rem]:w-11 max-[22.5rem]:px-0 md:h-9"
        onClick={() => setDialog("create")}
      >
        <Plus />
        <span class="max-[22.5rem]:sr-only">New version</span>
      </button>
      <VersionDialog
        open={dialog() !== null}
        mode={dialog() ?? "create"}
        initial={
          dialog() === "rename"
            ? {
                name: activeVersion()?.name,
                jobTitle: activeVersion()?.jobTitle,
                company: activeVersion()?.company,
              }
            : undefined
        }
        onClose={() => setDialog(null)}
        onSubmit={(details) => (dialog() === "rename" ? rename(details) : create(details))}
      />
    </div>
  );
}
