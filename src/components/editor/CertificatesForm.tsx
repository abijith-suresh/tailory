import type { Component } from "solid-js";
import { resume, setResume } from "@/store/resume";
import type { ResumeCertificate } from "@/types/resume";
import { ReorderableList } from "@/components/ui/ReorderableList";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";

function newCertificate(): ResumeCertificate {
  return {
    id: crypto.randomUUID(),
    name: "",
    issuer: "",
    date: "",
    url: "",
  };
}

const CertificatesForm: Component = () => {
  const addEntry = () => {
    setResume("certificates", (c) => [...(c ?? []), newCertificate()]);
  };

  const removeEntry = (id: string) => {
    setResume("certificates", (c) => (c ?? []).filter((e) => e.id !== id));
  };

  const reorder = (items: ResumeCertificate[]) => {
    setResume("certificates", items);
  };

  const updateField = <K extends keyof ResumeCertificate>(
    id: string,
    field: K,
    value: ResumeCertificate[K]
  ) => {
    setResume("certificates", (c) => c?.id === id, field, value);
  };

  return (
    <ReorderableList
      items={resume.certificates ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add certificate"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Certificate Name" id={`cert-name-${item.id}`}>
            <Input
              id={`cert-name-${item.id}`}
              value={item.name}
              onInput={(v) => updateField(item.id, "name", v)}
              placeholder="AWS Certified Solutions Architect"
            />
          </FormField>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Issuer" id={`cert-issuer-${item.id}`}>
              <Input
                id={`cert-issuer-${item.id}`}
                value={item.issuer ?? ""}
                onInput={(v) => updateField(item.id, "issuer", v)}
                placeholder="Amazon Web Services"
              />
            </FormField>
            <FormField label="Date" id={`cert-date-${item.id}`}>
              <Input
                id={`cert-date-${item.id}`}
                value={item.date ?? ""}
                onInput={(v) => updateField(item.id, "date", v)}
                placeholder="2023"
              />
            </FormField>
          </div>

          <FormField label="URL (optional)" id={`cert-url-${item.id}`}>
            <Input
              id={`cert-url-${item.id}`}
              type="url"
              value={item.url ?? ""}
              onInput={(v) => updateField(item.id, "url", v)}
              placeholder="https://aws.amazon.com/certification/…"
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default CertificatesForm;
