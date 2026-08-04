import type { Component } from "solid-js";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";
import type { ResumeAward } from "@/types/resume";

function newAward(): ResumeAward {
  return {
    id: crypto.randomUUID(),
    title: "",
    awarder: "",
    date: "",
    summary: "",
  };
}

const AwardsForm: Component = () => {
  const addEntry = () => {
    setResume("awards", (entries) => [...(entries ?? []), newAward()]);
  };

  const removeEntry = (id: string) => {
    setResume("awards", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumeAward[]) => {
    setResume("awards", items);
  };

  const updateField = <K extends keyof ResumeAward>(
    id: string,
    field: K,
    value: ResumeAward[K]
  ) => {
    setResume("awards", (entry) => entry?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.awards ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add award"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Award Title" id={`award-title-${item.id}`}>
            <Input
              id={`award-title-${item.id}`}
              value={item.title}
              onInput={(v) => updateField(item.id, "title", v)}
              placeholder="Engineering Excellence Award"
            />
          </FormField>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Awarder" id={`award-awarder-${item.id}`}>
              <Input
                id={`award-awarder-${item.id}`}
                value={item.awarder ?? ""}
                onInput={(v) => updateField(item.id, "awarder", v)}
                placeholder="Acme Corp"
              />
            </FormField>
            <FormField label="Date" id={`award-date-${item.id}`}>
              <Input
                id={`award-date-${item.id}`}
                value={item.date ?? ""}
                onInput={(v) => updateField(item.id, "date", v)}
                placeholder="2024"
              />
            </FormField>
          </div>

          <FormField label="Summary" id={`award-summary-${item.id}`}>
            <Textarea
              id={`award-summary-${item.id}`}
              value={item.summary ?? ""}
              onInput={(v) => updateField(item.id, "summary", v)}
              placeholder="What was this recognition for?"
              rows={2}
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default AwardsForm;
