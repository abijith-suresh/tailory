import { type Component, For } from "solid-js";
import { produce } from "solid-js/store";
import { resume, setResume } from "@/store/resume";
import type { ResumeWork } from "@/types/resume";
import { ReorderableList } from "@/components/ui/ReorderableList";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

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

          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700">Highlights / Bullets</label>
            <div class="space-y-2">
              <For each={item.highlights}>
                {(h, idx) => (
                  <div class="flex gap-2">
                    <Textarea
                      value={h}
                      onInput={(v) => updateHighlight(item.id, idx(), v)}
                      placeholder="Led development of…"
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
                + Add bullet
              </button>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default WorkForm;
