import type { Component } from "solid-js";

import { EntryList } from "@/components/ui/EntryList";
import { createId } from "@/lib/resume/ids";
import { deleteEntry } from "@/store/document";
import { keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeCertificate } from "@/types/resume";
import VersionedField from "./VersionedField";

type CertificateText = "name" | "issuer" | "date" | "url";

const CertificatesForm: Component = () => {
  const addEntry = () => {
    const entry: ResumeCertificate = { id: createId(), name: "", issuer: "", date: "", url: "" };
    setResume("certificates", (list) => [...(list ?? []), entry]);
    keepOnlyInActiveVersion(entry.id);
  };

  const field = (item: ResumeCertificate, key: CertificateText) => ({
    value: item[key] ?? "",
    onInput: (value: string) => setResume("certificates", (c) => c?.id === item.id, key, value),
    reword: { itemId: item.id, field: key },
  });

  return (
    <EntryList
      items={resume.certificates ?? []}
      title={(item) => item.name}
      meta={(item) => item.date ?? ""}
      onReorder={(items) => setResume("certificates", items)}
      onRemove={(id) => deleteEntry("certificates", id)}
      onAdd={addEntry}
      addLabel="Add certificate"
      renderItem={(item) => (
        <>
          <VersionedField
            id={`cert-name-${item.id}`}
            label="Certificate"
            placeholder="AWS Certified Solutions Architect"
            {...field(item, "name")}
          />
          <div class="grid gap-4 @md:grid-cols-2">
            <VersionedField
              id={`cert-issuer-${item.id}`}
              label="Issuer"
              placeholder="Amazon Web Services"
              {...field(item, "issuer")}
            />
            <VersionedField
              id={`cert-date-${item.id}`}
              label="Date"
              placeholder="2023"
              {...field(item, "date")}
            />
          </div>
          <VersionedField
            id={`cert-url-${item.id}`}
            label="URL (optional)"
            type="url"
            placeholder="https://aws.amazon.com/certification/…"
            {...field(item, "url")}
          />
        </>
      )}
    />
  );
};

export default CertificatesForm;
