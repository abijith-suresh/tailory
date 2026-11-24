import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumePublication } from "@/types/resume";
import VersionedField from "./VersionedField";

type PublicationText = "name" | "publisher" | "releaseDate" | "url" | "summary";

const PublicationsForm: Component = () => {
  const addEntry = () => {
    const entry: ResumePublication = {
      id: createId(),
      name: "",
      publisher: "",
      releaseDate: "",
      url: "",
      summary: "",
    };
    setResume("publications", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumePublication, key: PublicationText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("publications", (p) => p?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.publications ?? []}
      title={(item) => item.name}
      meta={(item) => item.releaseDate ?? ""}
      onReorder={(items) => setResume("publications", items)}
      onRemove={(id) => deleteEntry("publications", id)}
      onAdd={addEntry}
      addLabel="Add publication"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`pub-name-${item.id}`}
            label="Title"
            placeholder="Scaling search at Acme"
            {...field(item, "name")}
          />
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`pub-publisher-${item.id}`}
              label="Publisher"
              placeholder="ACM Queue"
              {...field(item, "publisher")}
            />
            <VersionedField
              id={`pub-date-${item.id}`}
              label="Release date"
              placeholder="Jun 2024"
              {...field(item, "releaseDate")}
            />
          </div>
          <VersionedField
            id={`pub-url-${item.id}`}
            label="URL (optional)"
            type="url"
            placeholder="https://queue.acm.org/…"
            {...field(item, "url")}
          />
          <VersionedField
            id={`pub-summary-${item.id}`}
            label="Summary"
            multiline
            rows={2}
            placeholder="A short description of the publication…"
            {...field(item, "summary")}
          />
        </>
      )}
    />
  );
};

export default PublicationsForm;
