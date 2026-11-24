import type { Component } from "solid-js";
import { produce } from "solid-js/store";

import { EntryList } from "@/components/ui/EntryList";
import HighlightList from "@/components/ui/HighlightList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry, deleteHighlight } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeProject } from "@/types/resume";
import VersionedField from "./VersionedField";

function newProject(): ResumeProject {
  return { id: createId(), name: "", description: "", highlights: [], url: "" };
}

type ProjectText = "name" | "description" | "url";

const ProjectsForm: Component = () => {
  const addEntry = () => {
    const entry = newProject();
    setResume("projects", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const addHighlight = (id: string) => {
    const highlight = { id: createId(), text: "" };
    setResume(
      "projects",
      (p) => p?.id === id,
      produce((p: ResumeProject) => {
        p.highlights = [...(p.highlights ?? []), highlight];
      })
    );
    keepOnlyInActiveVersion(highlight.id);
  };

  const removeHighlight = (id: string, idx: number) => {
    const highlight = resume.projects?.find((entry) => entry.id === id)?.highlights?.[idx];
    if (highlight) deleteHighlight("projects", id, highlight.id);
  };

  const field = (item: ResumeProject, key: ProjectText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("projects", (p) => p?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.projects ?? []}
      title={(item) => item.name}
      onReorder={(items) => setResume("projects", items)}
      onRemove={(id) => deleteEntry("projects", id)}
      onAdd={addEntry}
      addLabel="Add project"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`proj-name-${item.id}`}
            label="Project name"
            placeholder="Open source CLI tool"
            {...field(item, "name")}
          />
          <VersionedField
            id={`proj-desc-${item.id}`}
            label="Description"
            multiline
            rows={2}
            placeholder="A short description of the project…"
            {...field(item, "description")}
          />
          <VersionedField
            id={`proj-url-${item.id}`}
            label="URL (optional)"
            type="url"
            placeholder="https://github.com/you/project"
            {...field(item, "url")}
          />
        </>
      )}
      renderBullets={(item) => (
        <HighlightList
          highlights={item.highlights ?? []}
          idPrefix={`project-highlight-${item.id}`}
          label="Highlights"
          addLabel="Add highlight"
          placeholder="Built with TypeScript…"
          onInput={(index, value) =>
            setResume("projects", (p) => p?.id === item.id, "highlights", index, "text", value)
          }
          onRemove={(index) => removeHighlight(item.id, index)}
          onAdd={() => addHighlight(item.id)}
        />
      )}
    />
  );
};

export default ProjectsForm;
