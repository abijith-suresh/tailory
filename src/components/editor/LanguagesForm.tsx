import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeLanguage } from "@/types/resume";
import VersionedField from "./VersionedField";

type LanguageText = "language" | "fluency";

const LanguagesForm: Component = () => {
  const addEntry = () => {
    const entry: ResumeLanguage = { id: createId(), language: "", fluency: "" };
    setResume("languages", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumeLanguage, key: LanguageText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("languages", (l) => l?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.languages ?? []}
      title={(item) => item.language}
      meta={(item) => item.fluency ?? ""}
      onReorder={(items) => setResume("languages", items)}
      onRemove={(id) => deleteEntry("languages", id)}
      onAdd={addEntry}
      addLabel="Add language"
      renderItem={(item) => (
        <div class="grid gap-4 @md:grid-cols-2">
          <VersionedField
            id={`lang-name-${item.id}`}
            label="Language"
            placeholder="English"
            {...field(item, "language")}
          />
          <VersionedField
            id={`lang-fluency-${item.id}`}
            label="Fluency"
            placeholder="Native"
            {...field(item, "fluency")}
          />
        </div>
      )}
    />
  );
};

export default LanguagesForm;
