import { type Component, For } from "solid-js";
import { produce } from "solid-js/store";
import { resume, setResume } from "@/store/resume";
import type { ResumeProject } from "@/types/resume";
import { ReorderableList } from "@/components/ui/ReorderableList";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

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

          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700">Highlights</label>
            <div class="space-y-2">
              <For each={item.highlights}>
                {(h, idx) => (
                  <div class="flex gap-2">
                    <Textarea
                      value={h}
                      onInput={(v) => updateHighlight(item.id, idx(), v)}
                      placeholder="Built with TypeScript…"
                      rows={2}
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(item.id, idx())}
                      aria-label="Remove highlight"
                      class="mt-1 flex-shrink-0 text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
              <button
                type="button"
                onClick={() => addHighlight(item.id)}
                class="text-xs text-indigo-600 hover:underline"
              >
                + Add highlight
              </button>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default ProjectsForm;
