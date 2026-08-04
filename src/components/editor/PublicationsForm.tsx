import type { Component } from "solid-js";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";
import type { ResumePublication } from "@/types/resume";

function newPublication(): ResumePublication {
  return {
    id: crypto.randomUUID(),
    name: "",
    publisher: "",
    releaseDate: "",
    url: "",
    summary: "",
  };
}

const PublicationsForm: Component = () => {
  const addEntry = () => {
    setResume("publications", (entries) => [...(entries ?? []), newPublication()]);
  };

  const removeEntry = (id: string) => {
    setResume("publications", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumePublication[]) => {
    setResume("publications", items);
  };

  const updateField = <K extends keyof ResumePublication>(
    id: string,
    field: K,
    value: ResumePublication[K]
  ) => {
    setResume("publications", (entry) => entry?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.publications ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add publication"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Publication Title" id={`pub-name-${item.id}`}>
            <Input
              id={`pub-name-${item.id}`}
              value={item.name}
              onInput={(v) => updateField(item.id, "name", v)}
              placeholder="Designing reliable browser apps"
            />
          </FormField>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Publisher" id={`pub-publisher-${item.id}`}>
              <Input
                id={`pub-publisher-${item.id}`}
                value={item.publisher ?? ""}
                onInput={(v) => updateField(item.id, "publisher", v)}
                placeholder="Frontend Weekly"
              />
            </FormField>
            <FormField label="Release Date" id={`pub-date-${item.id}`}>
              <Input
                id={`pub-date-${item.id}`}
                value={item.releaseDate ?? ""}
                onInput={(v) => updateField(item.id, "releaseDate", v)}
                placeholder="May 2024"
              />
            </FormField>
          </div>

          <FormField label="URL (optional)" id={`pub-url-${item.id}`}>
            <Input
              id={`pub-url-${item.id}`}
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://example.com/article"
            />
          </FormField>

          <FormField label="Summary" id={`pub-summary-${item.id}`}>
            <Textarea
              id={`pub-summary-${item.id}`}
              value={item.summary ?? ""}
              onInput={(v) => updateField(item.id, "summary", v)}
              placeholder="What is this publication about?"
              rows={2}
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default PublicationsForm;
