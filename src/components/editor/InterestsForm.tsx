import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeInterest } from "@/types/resume";
import VersionedField from "./VersionedField";

function parseKeywords(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

const InterestsForm: Component = () => {
  const addEntry = () => {
    const entry: ResumeInterest = { id: createId(), name: "", keywords: [] };
    setResume("interests", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  return (
    <EntryList
      items={resume.interests ?? []}
      title={(item) => item.name}
      onReorder={(items) => setResume("interests", items)}
      onRemove={(id) => deleteEntry("interests", id)}
      onAdd={addEntry}
      addLabel="Add interest"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`interest-name-${item.id}`}
            label="Interest"
            placeholder="Open source"
            value={item.name}
            onInput={(value) => setResume("interests", (i) => i?.id === item.id, "name", value)}
            reword={{ itemId: item.id, field: "name" }}
          />
          <VersionedField
            id={`interest-keywords-${item.id}`}
            label="Keywords (optional)"
            placeholder="community, mentoring, web performance"
            value={(item.keywords ?? []).join(", ")}
            onInput={(value) =>
              setResume("interests", (i) => i?.id === item.id, "keywords", parseKeywords(value))
            }
          />
        </>
      )}
    />
  );
};

export default InterestsForm;
