import type { Component } from "solid-js";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import { resume, setResume } from "@/store/resume";
import type { ResumeLanguage } from "@/types/resume";

function newLanguage(): ResumeLanguage {
  return {
    id: crypto.randomUUID(),
    language: "",
    fluency: "",
  };
}

const LanguagesForm: Component = () => {
  const addEntry = () => {
    setResume("languages", (entries) => [...(entries ?? []), newLanguage()]);
  };

  const removeEntry = (id: string) => {
    setResume("languages", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumeLanguage[]) => {
    setResume("languages", items);
  };

  const updateField = <K extends keyof ResumeLanguage>(
    id: string,
    field: K,
    value: ResumeLanguage[K]
  ) => {
    setResume("languages", (entry) => entry?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.languages ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add language"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Language" id={`lang-name-${item.id}`}>
              <Input
                id={`lang-name-${item.id}`}
                value={item.language}
                onInput={(v) => updateField(item.id, "language", v)}
                placeholder="English"
              />
            </FormField>
            <FormField label="Fluency" id={`lang-fluency-${item.id}`}>
              <Input
                id={`lang-fluency-${item.id}`}
                value={item.fluency ?? ""}
                onInput={(v) => updateField(item.id, "fluency", v)}
                placeholder="Native"
              />
            </FormField>
          </div>
        </div>
      )}
    />
  );
};

export default LanguagesForm;
