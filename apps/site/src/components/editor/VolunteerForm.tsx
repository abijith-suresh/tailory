import type { ResumeVolunteer } from "@tailory/core";
import type { Component } from "solid-js";
import { produce } from "solid-js/store";
import FormField from "@/components/ui/FormField";
import HighlightList from "@/components/ui/HighlightList";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import Textarea from "@/components/ui/Textarea";
import { resume, setResume } from "@/store/resume";

function newVolunteer(): ResumeVolunteer {
  return {
    id: crypto.randomUUID(),
    organization: "",
    position: "",
    startDate: "",
    endDate: "",
    summary: "",
    highlights: [],
  };
}

const VolunteerForm: Component = () => {
  const addEntry = () => {
    setResume("volunteer", (v) => [...(v ?? []), newVolunteer()]);
  };

  const removeEntry = (id: string) => {
    setResume("volunteer", (v) => (v ?? []).filter((e) => e.id !== id));
  };

  const reorder = (items: ResumeVolunteer[]) => {
    setResume("volunteer", items);
  };

  const updateField = <K extends keyof ResumeVolunteer>(
    id: string,
    field: K,
    value: ResumeVolunteer[K]
  ) => {
    setResume("volunteer", (v) => v?.id === id, field, value);
  };

  const addHighlight = (id: string) => {
    setResume(
      "volunteer",
      (v) => v?.id === id,
      produce((v: ResumeVolunteer) => {
        if (!v.highlights) v.highlights = [];
        v.highlights.push("");
      })
    );
  };

  const updateHighlight = (id: string, idx: number, value: string) => {
    setResume("volunteer", (v) => v?.id === id, "highlights", idx, value);
  };

  const removeHighlight = (id: string, idx: number) => {
    setResume(
      "volunteer",
      (v) => v?.id === id,
      produce((v: ResumeVolunteer) => {
        v.highlights?.splice(idx, 1);
      })
    );
  };

  return (
    <ReorderableList
      items={resume.volunteer ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add volunteer role"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <div class="grid grid-cols-2 gap-3">
            <FormField label="Organization" id={`volunteer-org-${item.id}`}>
              <Input
                id={`volunteer-org-${item.id}`}
                value={item.organization}
                onInput={(v) => updateField(item.id, "organization", v)}
                placeholder="Code Club"
              />
            </FormField>
            <FormField label="Role" id={`volunteer-pos-${item.id}`}>
              <Input
                id={`volunteer-pos-${item.id}`}
                value={item.position}
                onInput={(v) => updateField(item.id, "position", v)}
                placeholder="Mentor"
              />
            </FormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Start Date" id={`volunteer-start-${item.id}`}>
              <Input
                id={`volunteer-start-${item.id}`}
                value={item.startDate ?? ""}
                onInput={(v) => updateField(item.id, "startDate", v)}
                placeholder="Mar 2022"
              />
            </FormField>
            <FormField label="End Date" id={`volunteer-end-${item.id}`}>
              <Input
                id={`volunteer-end-${item.id}`}
                value={item.endDate ?? ""}
                onInput={(v) => updateField(item.id, "endDate", v)}
                placeholder="Present"
              />
            </FormField>
          </div>

          <FormField label="URL (optional)" id={`volunteer-url-${item.id}`}>
            <Input
              id={`volunteer-url-${item.id}`}
              type="url"
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://codeclub.org"
            />
          </FormField>

          <FormField label="Summary" id={`volunteer-summary-${item.id}`}>
            <Textarea
              id={`volunteer-summary-${item.id}`}
              value={item.summary ?? ""}
              onInput={(v) => updateField(item.id, "summary", v)}
              placeholder="What you did and who it helped…"
              rows={2}
            />
          </FormField>

          <HighlightList
            highlights={item.highlights ?? []}
            idPrefix={`volunteer-highlight-${item.id}`}
            label="Highlights / Bullets"
            addLabel="Add bullet"
            placeholder="Ran weekly coding sessions for…"
            onInput={(index, value) => updateHighlight(item.id, index, value)}
            onRemove={(index) => removeHighlight(item.id, index)}
            onAdd={() => addHighlight(item.id)}
          />
        </div>
      )}
    />
  );
};

export default VolunteerForm;
