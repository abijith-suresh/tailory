import type { Component } from "solid-js";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import { resume, setResume } from "@/store/resume";
import type { ResumeInterest } from "@/types/resume";

function newInterest(): ResumeInterest {
  return {
    id: crypto.randomUUID(),
    name: "",
    keywords: [],
  };
}

function parseKeywords(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

const InterestsForm: Component = () => {
  const addEntry = () => {
    setResume("interests", (entries) => [...(entries ?? []), newInterest()]);
  };

  const removeEntry = (id: string) => {
    setResume("interests", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumeInterest[]) => {
    setResume("interests", items);
  };

  const updateField = <K extends keyof ResumeInterest>(
    id: string,
    field: K,
    value: ResumeInterest[K]
  ) => {
    setResume("interests", (entry) => entry?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.interests ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add interest"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Interest" id={`interest-name-${item.id}`}>
            <Input
              id={`interest-name-${item.id}`}
              value={item.name}
              onInput={(v) => updateField(item.id, "name", v)}
              placeholder="Open source"
            />
          </FormField>

          <FormField label="Keywords (optional)" id={`interest-keywords-${item.id}`}>
            <Input
              id={`interest-keywords-${item.id}`}
              value={(item.keywords ?? []).join(", ")}
              onInput={(v) => updateField(item.id, "keywords", parseKeywords(v))}
              placeholder="community, mentoring, web performance"
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default InterestsForm;
