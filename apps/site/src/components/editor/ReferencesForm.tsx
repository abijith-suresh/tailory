import type { Component } from "solid-js";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";
import type { ResumeReference } from "@/types/resume";

function newReference(): ResumeReference {
  return {
    id: crypto.randomUUID(),
    name: "",
    reference: "",
  };
}

const ReferencesForm: Component = () => {
  const addEntry = () => {
    setResume("references", (entries) => [...(entries ?? []), newReference()]);
  };

  const removeEntry = (id: string) => {
    setResume("references", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumeReference[]) => {
    setResume("references", items);
  };

  const updateField = <K extends keyof ResumeReference>(
    id: string,
    field: K,
    value: ResumeReference[K]
  ) => {
    setResume("references", (entry) => entry?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.references ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add reference"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Reference Name" id={`reference-name-${item.id}`}>
            <Input
              id={`reference-name-${item.id}`}
              value={item.name}
              onInput={(v) => updateField(item.id, "name", v)}
              placeholder="Alex Smith"
            />
          </FormField>

          <FormField label="Reference" id={`reference-text-${item.id}`}>
            <Textarea
              id={`reference-text-${item.id}`}
              value={item.reference ?? ""}
              onInput={(v) => updateField(item.id, "reference", v)}
              placeholder="Worked closely with Alex for three years..."
              rows={3}
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default ReferencesForm;
