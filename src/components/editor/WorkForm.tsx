import type { Component } from "solid-js";
import { produce } from "solid-js/store";

import { EntryList } from "@/components/ui/EntryList";
import HighlightList from "@/components/ui/HighlightList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry, deleteHighlight } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeWork } from "@/types/resume";
import VersionedField from "./VersionedField";

function newWork(): ResumeWork {
  return { id: createId(), name: "", position: "", startDate: "", endDate: "", highlights: [] };
}

type WorkText = "name" | "position" | "startDate" | "endDate" | "url" | "summary";

const WorkForm: Component = () => {
  const addEntry = () => {
    const entry = newWork();
    setResume("work", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const updateField = (id: string, field: WorkText, value: string) => {
    setResume("work", (w) => w?.id === id, field, value);
  };

  const addHighlight = (id: string) => {
    const highlight = { id: createId(), text: "" };
    setResume(
      "work",
      (w) => w?.id === id,
      produce((w: ResumeWork) => {
        w.highlights = [...(w.highlights ?? []), highlight];
      })
    );
    keepOnlyInActiveVersion(highlight.id);
  };

  const removeHighlight = (id: string, idx: number) => {
    const highlight = resume.work?.find((entry) => entry.id === id)?.highlights?.[idx];
    if (highlight) deleteHighlight("work", id, highlight.id);
  };

  const field = (item: ResumeWork, key: WorkText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => updateField(item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.work ?? []}
      title={(item) => [item.position, item.name].filter(Boolean).join(", ")}
      meta={(item) => [item.startDate, item.endDate].filter(Boolean).join(" – ")}
      onReorder={(items) => setResume("work", items)}
      onRemove={(id) => deleteEntry("work", id)}
      onAdd={addEntry}
      addLabel="Add work experience"
      renderItem={(item) => (
        <>
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`work-name-${item.id}`}
              label="Company"
              placeholder="Acme Corp"
              autocomplete="organization"
              {...field(item, "name")}
            />
            <VersionedField
              id={`work-pos-${item.id}`}
              label="Role"
              placeholder="Software engineer"
              autocomplete="organization-title"
              {...field(item, "position")}
            />
            <VersionedField
              id={`work-start-${item.id}`}
              label="Start date"
              placeholder="Jan 2021"
              {...field(item, "startDate")}
            />
            <VersionedField
              id={`work-end-${item.id}`}
              label="End date"
              placeholder="Present"
              {...field(item, "endDate")}
            />
          </div>
          <VersionedField
            id={`work-url-${item.id}`}
            label="URL (optional)"
            type="url"
            placeholder="https://acme.com"
            {...field(item, "url")}
          />
        </>
      )}
      renderBullets={(item) => (
        <HighlightList
          highlights={item.highlights ?? []}
          idPrefix={`work-highlight-${item.id}`}
          label="Highlights"
          addLabel="Add bullet"
          placeholder="Led development of…"
          onInput={(index, value) =>
            setResume("work", (w) => w?.id === item.id, "highlights", index, "text", value)
          }
          onRemove={(index) => removeHighlight(item.id, index)}
          onAdd={() => addHighlight(item.id)}
        />
      )}
    />
  );
};

export default WorkForm;
