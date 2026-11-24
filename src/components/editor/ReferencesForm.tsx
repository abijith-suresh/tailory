import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeReference } from "@/types/resume";
import VersionedField from "./VersionedField";

type ReferenceText = "name" | "reference";

const ReferencesForm: Component = () => {
  const addEntry = () => {
    const entry: ResumeReference = { id: createId(), name: "", reference: "" };
    setResume("references", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumeReference, key: ReferenceText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("references", (r) => r?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.references ?? []}
      title={(item) => item.name}
      onReorder={(items) => setResume("references", items)}
      onRemove={(id) => deleteEntry("references", id)}
      onAdd={addEntry}
      addLabel="Add reference"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`reference-name-${item.id}`}
            label="Name"
            placeholder="Alex Smith"
            {...field(item, "name")}
          />
          <VersionedField
            id={`reference-text-${item.id}`}
            label="Reference"
            multiline
            rows={3}
            placeholder="Worked closely with Alex for three years…"
            {...field(item, "reference")}
          />
        </>
      )}
    />
  );
};

export default ReferencesForm;
