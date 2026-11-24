import type { Component } from "solid-js";
import { produce } from "solid-js/store";

import { EntryList } from "@/components/ui/EntryList";
import HighlightList from "@/components/ui/HighlightList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry, deleteHighlight } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeVolunteer } from "@/types/resume";
import VersionedField from "./VersionedField";

function newVolunteer(): ResumeVolunteer {
  return {
    id: createId(),
    organization: "",
    position: "",
    startDate: "",
    endDate: "",
    summary: "",
    highlights: [],
  };
}

type VolunteerText = "organization" | "position" | "startDate" | "endDate" | "url" | "summary";

const VolunteerForm: Component = () => {
  const addEntry = () => {
    const entry = newVolunteer();
    setResume("volunteer", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const addHighlight = (id: string) => {
    const highlight = { id: createId(), text: "" };
    setResume(
      "volunteer",
      (v) => v?.id === id,
      produce((v: ResumeVolunteer) => {
        v.highlights = [...(v.highlights ?? []), highlight];
      })
    );
    keepOnlyInActiveVersion(highlight.id);
  };

  const removeHighlight = (id: string, idx: number) => {
    const highlight = resume.volunteer?.find((entry) => entry.id === id)?.highlights?.[idx];
    if (highlight) deleteHighlight("volunteer", id, highlight.id);
  };

  const field = (item: ResumeVolunteer, key: VolunteerText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("volunteer", (v) => v?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.volunteer ?? []}
      title={(item) => [item.position, item.organization].filter(Boolean).join(", ")}
      meta={(item) => [item.startDate, item.endDate].filter(Boolean).join(" – ")}
      onReorder={(items) => setResume("volunteer", items)}
      onRemove={(id) => deleteEntry("volunteer", id)}
      onAdd={addEntry}
      addLabel="Add volunteer role"
      renderItem={(item) => (
        <>
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`volunteer-org-${item.id}`}
              label="Organization"
              placeholder="Code Club"
              {...field(item, "organization")}
            />
            <VersionedField
              id={`volunteer-pos-${item.id}`}
              label="Role"
              placeholder="Mentor"
              {...field(item, "position")}
            />
            <VersionedField
              id={`volunteer-start-${item.id}`}
              label="Start date"
              placeholder="Mar 2022"
              {...field(item, "startDate")}
            />
            <VersionedField
              id={`volunteer-end-${item.id}`}
              label="End date"
              placeholder="Present"
              {...field(item, "endDate")}
            />
          </div>
          <VersionedField
            id={`volunteer-url-${item.id}`}
            label="URL (optional)"
            type="url"
            placeholder="https://codeclub.org"
            {...field(item, "url")}
          />
          <VersionedField
            id={`volunteer-summary-${item.id}`}
            label="Summary"
            multiline
            rows={2}
            placeholder="What you did and who it helped…"
            {...field(item, "summary")}
          />
        </>
      )}
      renderBullets={(item) => (
        <HighlightList
          highlights={item.highlights ?? []}
          idPrefix={`volunteer-highlight-${item.id}`}
          label="Highlights"
          addLabel="Add bullet"
          placeholder="Ran weekly coding sessions for…"
          onInput={(index, value) =>
            setResume("volunteer", (v) => v?.id === item.id, "highlights", index, "text", value)
          }
          onRemove={(index) => removeHighlight(item.id, index)}
          onAdd={() => addHighlight(item.id)}
        />
      )}
    />
  );
};

export default VolunteerForm;
