import type { Component } from "solid-js";
import { produce } from "solid-js/store";

import FormField from "@/components/ui/FormField";
import HighlightList from "@/components/ui/HighlightList";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import { resume, setResume } from "@/store/resume";
import type { ResumeWork } from "@/types/resume";

function newWork(): ResumeWork {
  return {
    id: crypto.randomUUID(),
    name: "",
    position: "",
    startDate: "",
    endDate: "",
    highlights: [],
  };
}

const WorkForm: Component = () => {
  const addEntry = () => {
    setResume("work", (w) => [...(w ?? []), newWork()]);
  };

  const removeEntry = (id: string) => {
    setResume("work", (w) => (w ?? []).filter((e) => e.id !== id));
  };

  const reorder = (items: ResumeWork[]) => {
    setResume("work", items);
  };

  const updateField = <K extends keyof ResumeWork>(id: string, field: K, value: ResumeWork[K]) => {
    setResume("work", (w) => w?.id === id, field, value);
  };

  const addHighlight = (id: string) => {
    setResume(
      "work",
      (w) => w?.id === id,
      produce((w: ResumeWork) => {
        if (!w.highlights) w.highlights = [];
        w.highlights.push("");
      })
    );
  };

  const updateHighlight = (id: string, idx: number, value: string) => {
    setResume("work", (w) => w?.id === id, "highlights", idx, value);
  };

  const removeHighlight = (id: string, idx: number) => {
    setResume(
      "work",
      (w) => w?.id === id,
      produce((w: ResumeWork) => {
        w.highlights?.splice(idx, 1);
      })
    );
  };

  return (
    <ReorderableList
      items={resume.work ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add work experience"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Company" id={`work-name-${item.id}`}>
              <Input
                id={`work-name-${item.id}`}
                value={item.name}
                onInput={(v) => updateField(item.id, "name", v)}
                placeholder="Acme Corp"
              />
            </FormField>
            <FormField label="Role / Title" id={`work-pos-${item.id}`}>
              <Input
                id={`work-pos-${item.id}`}
                value={item.position}
                onInput={(v) => updateField(item.id, "position", v)}
                placeholder="Software Engineer"
              />
            </FormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Start Date" id={`work-start-${item.id}`}>
              <Input
                id={`work-start-${item.id}`}
                value={item.startDate ?? ""}
                onInput={(v) => updateField(item.id, "startDate", v)}
                placeholder="Jan 2021"
              />
            </FormField>
            <FormField label="End Date" id={`work-end-${item.id}`}>
              <Input
                id={`work-end-${item.id}`}
                value={item.endDate ?? ""}
                onInput={(v) => updateField(item.id, "endDate", v)}
                placeholder="Present"
              />
            </FormField>
          </div>

          <FormField label="URL (optional)" id={`work-url-${item.id}`}>
            <Input
              id={`work-url-${item.id}`}
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://acme.com"
            />
          </FormField>

          <HighlightList
            highlights={item.highlights ?? []}
            idPrefix={`work-highlight-${item.id}`}
            label="Highlights / Bullets"
            addLabel="Add bullet"
            placeholder="Led development of…"
            onInput={(index, value) => updateHighlight(item.id, index, value)}
            onRemove={(index) => removeHighlight(item.id, index)}
            onAdd={() => addHighlight(item.id)}
          />
        </div>
      )}
    />
  );
};

export default WorkForm;
