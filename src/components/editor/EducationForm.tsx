import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeEducation } from "@/types/resume";
import VersionedField from "./VersionedField";

function newEducation(): ResumeEducation {
  return { id: createId(), institution: "", area: "", studyType: "", startDate: "", endDate: "" };
}

type EducationText = "institution" | "studyType" | "area" | "startDate" | "endDate" | "score";

const EducationForm: Component = () => {
  const addEntry = () => {
    const entry = newEducation();
    setResume("education", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumeEducation, key: EducationText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("education", (e) => e?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.education ?? []}
      title={(item) => [item.studyType, item.institution].filter(Boolean).join(", ")}
      meta={(item) => [item.startDate, item.endDate].filter(Boolean).join(" – ")}
      onReorder={(items) => setResume("education", items)}
      onRemove={(id) => deleteEntry("education", id)}
      onAdd={addEntry}
      addLabel="Add education"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`edu-inst-${item.id}`}
            label="Institution"
            placeholder="University of Technology"
            {...field(item, "institution")}
          />
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`edu-type-${item.id}`}
              label="Degree"
              placeholder="Bachelor of Science"
              {...field(item, "studyType")}
            />
            <VersionedField
              id={`edu-area-${item.id}`}
              label="Field of study"
              placeholder="Computer science"
              {...field(item, "area")}
            />
            <VersionedField
              id={`edu-start-${item.id}`}
              label="Start date"
              placeholder="2018"
              {...field(item, "startDate")}
            />
            <VersionedField
              id={`edu-end-${item.id}`}
              label="End date"
              placeholder="2022"
              {...field(item, "endDate")}
            />
          </div>
          <VersionedField
            id={`edu-score-${item.id}`}
            label="Grade (optional)"
            placeholder="3.8 / 4.0"
            {...field(item, "score")}
          />
        </>
      )}
    />
  );
};

export default EducationForm;
