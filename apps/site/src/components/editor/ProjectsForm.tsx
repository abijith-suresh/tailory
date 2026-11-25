import type { Component } from "solid-js";
import { produce } from "solid-js/store";

import FormField from "@/components/ui/FormField";
import HighlightList from "@/components/ui/HighlightList";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";
import type { ResumeProject } from "@/types/resume";

function newProject(): ResumeProject {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    highlights: [],
    url: "",
  };
}

const ProjectsForm: Component = () => {
  const addEntry = () => {
    setResume("projects", (p) => [...(p ?? []), newProject()]);
  };

  const removeEntry = (id: string) => {
    setResume("projects", (p) => (p ?? []).filter((e) => e.id !== id));
  };

  const reorder = (items: ResumeProject[]) => {
    setResume("projects", items);
  };

  const updateField = <K extends keyof ResumeProject>(
    id: string,
    field: K,
    value: ResumeProject[K]
  ) => {
    setResume("projects", (p) => p?.id === id, field, value);
  };

  const addHighlight = (id: string) => {
    setResume(
      "projects",
      (p) => p?.id === id,
      produce((p: ResumeProject) => {
        if (!p.highlights) p.highlights = [];
        p.highlights.push("");
      })
    );
  };

  const updateHighlight = (id: string, idx: number, value: string) => {
    setResume("projects", (p) => p?.id === id, "highlights", idx, value);
  };

  const removeHighlight = (id: string, idx: number) => {
    setResume(
      "projects",
      (p) => p?.id === id,
      produce((p: ResumeProject) => {
        p.highlights?.splice(idx, 1);
      })
    );
  };

  return (
    <ReorderableList
      items={resume.projects ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add project"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Project Name" id={`proj-name-${item.id}`}>
            <Input
              id={`proj-name-${item.id}`}
              value={item.name}
              onInput={(v) => updateField(item.id, "name", v)}
              placeholder="Open Source CLI Tool"
            />
          </FormField>

          <FormField label="Description" id={`proj-desc-${item.id}`}>
            <Textarea
              id={`proj-desc-${item.id}`}
              value={item.description ?? ""}
              onInput={(v) => updateField(item.id, "description", v)}
              placeholder="A short description of the project…"
              rows={2}
            />
          </FormField>

          <FormField label="URL (optional)" id={`proj-url-${item.id}`}>
            <Input
              id={`proj-url-${item.id}`}
              type="url"
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://github.com/you/project"
            />
          </FormField>

          <HighlightList
            highlights={item.highlights ?? []}
            idPrefix={`project-highlight-${item.id}`}
            label="Highlights"
            addLabel="Add highlight"
            placeholder="Built with TypeScript…"
            onInput={(index, value) => updateHighlight(item.id, index, value)}
            onRemove={(index) => removeHighlight(item.id, index)}
            onAdd={() => addHighlight(item.id)}
          />
        </div>
      )}
    />
  );
};

export default ProjectsForm;
