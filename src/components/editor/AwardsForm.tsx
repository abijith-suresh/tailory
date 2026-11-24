import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeAward } from "@/types/resume";
import VersionedField from "./VersionedField";

type AwardText = "title" | "awarder" | "date" | "summary";

const AwardsForm: Component = () => {
  const addEntry = () => {
    const entry: ResumeAward = { id: createId(), title: "", awarder: "", date: "", summary: "" };
    setResume("awards", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumeAward, key: AwardText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("awards", (a) => a?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.awards ?? []}
      title={(item) => item.title}
      meta={(item) => item.date ?? ""}
      onReorder={(items) => setResume("awards", items)}
      onRemove={(id) => deleteEntry("awards", id)}
      onAdd={addEntry}
      addLabel="Add award"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`award-title-${item.id}`}
            label="Award"
            placeholder="Engineering excellence award"
            {...field(item, "title")}
          />
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`award-awarder-${item.id}`}
              label="Awarded by"
              placeholder="Acme Corp"
              {...field(item, "awarder")}
            />
            <VersionedField
              id={`award-date-${item.id}`}
              label="Date"
              placeholder="2023"
              {...field(item, "date")}
            />
          </div>
          <VersionedField
            id={`award-summary-${item.id}`}
            label="Summary"
            multiline
            rows={2}
            placeholder="What the award recognized…"
            {...field(item, "summary")}
          />
        </>
      )}
    />
  );
};

export default AwardsForm;
