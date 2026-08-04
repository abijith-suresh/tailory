import { type Component, For } from "solid-js";
import { produce } from "solid-js/store";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";
import type { ResumeVolunteer } from "@/types/resume";

function newVolunteer(): ResumeVolunteer {
  return {
    id: crypto.randomUUID(),
    organization: "",
    position: "",
    startDate: "",
    endDate: "",
    summary: "",
    highlights: [],
    url: "",
  };
}

const VolunteerForm: Component = () => {
  const addEntry = () => {
    setResume("volunteer", (entries) => [...(entries ?? []), newVolunteer()]);
  };

  const removeEntry = (id: string) => {
    setResume("volunteer", (entries) => (entries ?? []).filter((entry) => entry.id !== id));
  };

  const reorder = (items: ResumeVolunteer[]) => {
    setResume("volunteer", items);
  };

  const updateField = <K extends keyof ResumeVolunteer>(
    id: string,
    field: K,
    value: ResumeVolunteer[K]
  ) => {
    setResume("volunteer", (entry) => entry?.id === id, field, value);
  };

  const addHighlight = (id: string) => {
    setResume(
      "volunteer",
      (entry) => entry?.id === id,
      produce((entry: ResumeVolunteer) => {
        if (!entry.highlights) entry.highlights = [];
        entry.highlights.push("");
      })
    );
  };

  const updateHighlight = (id: string, idx: number, value: string) => {
    setResume("volunteer", (entry) => entry?.id === id, "highlights", idx, value);
  };

  const removeHighlight = (id: string, idx: number) => {
    setResume(
      "volunteer",
      (entry) => entry?.id === id,
      produce((entry: ResumeVolunteer) => {
        entry.highlights?.splice(idx, 1);
      })
    );
  };

  return (
    <ReorderableList
      items={resume.volunteer ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add volunteer work"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Organization" id={`vol-org-${item.id}`}>
              <Input
                id={`vol-org-${item.id}`}
                value={item.organization}
                onInput={(v) => updateField(item.id, "organization", v)}
                placeholder="Code for Good"
              />
            </FormField>
            <FormField label="Role / Title" id={`vol-role-${item.id}`}>
              <Input
                id={`vol-role-${item.id}`}
                value={item.position}
                onInput={(v) => updateField(item.id, "position", v)}
                placeholder="Volunteer Mentor"
              />
            </FormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Start Date" id={`vol-start-${item.id}`}>
              <Input
                id={`vol-start-${item.id}`}
                value={item.startDate ?? ""}
                onInput={(v) => updateField(item.id, "startDate", v)}
                placeholder="Jan 2022"
              />
            </FormField>
            <FormField label="End Date" id={`vol-end-${item.id}`}>
              <Input
                id={`vol-end-${item.id}`}
                value={item.endDate ?? ""}
                onInput={(v) => updateField(item.id, "endDate", v)}
                placeholder="Present"
              />
            </FormField>
          </div>

          <FormField label="URL (optional)" id={`vol-url-${item.id}`}>
            <Input
              id={`vol-url-${item.id}`}
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://example.org"
            />
          </FormField>

          <FormField label="Summary" id={`vol-summary-${item.id}`}>
            <Textarea
              id={`vol-summary-${item.id}`}
              value={item.summary ?? ""}
              onInput={(v) => updateField(item.id, "summary", v)}
              placeholder="What did you contribute?"
              rows={2}
            />
          </FormField>

          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-700">Highlights / Bullets</label>
            <div class="space-y-2">
              <For each={item.highlights}>
                {(highlight, idx) => (
                  <div class="flex gap-2">
                    <Textarea
                      value={highlight}
                      onInput={(v) => updateHighlight(item.id, idx(), v)}
                      placeholder="Led workshops for new contributors…"
                      rows={2}
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(item.id, idx())}
                      aria-label="Remove highlight"
                      class="mt-1 flex-shrink-0 text-red-400 transition-colors active:opacity-70 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
              <button
                type="button"
                onClick={() => addHighlight(item.id)}
                class="text-xs text-[#1d6648] transition-colors hover:underline"
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

export default VolunteerForm;
