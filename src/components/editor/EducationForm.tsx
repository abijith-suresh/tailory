import { type Component, createSignal } from "solid-js";

import { validateChronologicalDateRange } from "@/lib/editor/validation";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ReorderableList } from "@/components/ui/ReorderableList";
import { resume, setResume } from "@/store/resume";
import type { ResumeEducation } from "@/types/resume";

function newEducation(): ResumeEducation {
  return {
    id: crypto.randomUUID(),
    institution: "",
    area: "",
    studyType: "",
    startDate: "",
    endDate: "",
  };
}

const EducationForm: Component = () => {
  const [dateErrors, setDateErrors] = createSignal<Record<string, string>>({});

  const validateDates = (id: string) => {
    const item = resume.education?.find((education) => education.id === id);
    const error = item ? validateChronologicalDateRange(item.startDate, item.endDate) : "";

    setDateErrors((current) => ({
      ...current,
      [id]: error,
    }));
  };

  const clearDateError = (id: string) => {
    setDateErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const addEntry = () => {
    setResume("education", (e) => [...(e ?? []), newEducation()]);
  };

  const removeEntry = (id: string) => {
    setResume("education", (e) => (e ?? []).filter((edu) => edu.id !== id));
    clearDateError(id);
  };

  const reorder = (items: ResumeEducation[]) => {
    setResume("education", items);
  };

  const updateField = <K extends keyof ResumeEducation>(
    id: string,
    field: K,
    value: ResumeEducation[K]
  ) => {
    setResume("education", (e) => e?.id === id, field, value);

    if ((field === "startDate" || field === "endDate") && dateErrors()[id]) {
      validateDates(id);
    }
  };

  return (
    <ReorderableList
      items={resume.education ?? []}
      onReorder={reorder}
      onRemove={removeEntry}
      onAdd={addEntry}
      addLabel="Add education"
      renderItem={(item) => (
        <div class="space-y-3 pr-12">
          <FormField label="Institution" id={`edu-inst-${item.id}`}>
            <Input
              id={`edu-inst-${item.id}`}
              value={item.institution}
              onInput={(v) => updateField(item.id, "institution", v)}
              placeholder="University of Technology"
            />
          </FormField>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Degree Type" id={`edu-type-${item.id}`}>
              <Input
                id={`edu-type-${item.id}`}
                value={item.studyType ?? ""}
                onInput={(v) => updateField(item.id, "studyType", v)}
                placeholder="Bachelor of Science"
              />
            </FormField>
            <FormField label="Field of Study" id={`edu-area-${item.id}`}>
              <Input
                id={`edu-area-${item.id}`}
                value={item.area ?? ""}
                onInput={(v) => updateField(item.id, "area", v)}
                placeholder="Computer Science"
              />
            </FormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <FormField label="Start Date" id={`edu-start-${item.id}`}>
              <Input
                id={`edu-start-${item.id}`}
                value={item.startDate ?? ""}
                onInput={(v) => updateField(item.id, "startDate", v)}
                onBlur={() => validateDates(item.id)}
                error={!!dateErrors()[item.id]}
                placeholder="2018"
              />
            </FormField>
            <FormField label="End Date" id={`edu-end-${item.id}`} error={dateErrors()[item.id]}>
              <Input
                id={`edu-end-${item.id}`}
                value={item.endDate ?? ""}
                onInput={(v) => updateField(item.id, "endDate", v)}
                onBlur={() => validateDates(item.id)}
                error={!!dateErrors()[item.id]}
                aria-describedby={dateErrors()[item.id] ? `edu-end-${item.id}-error` : undefined}
                placeholder="2022"
              />
            </FormField>
          </div>

          <FormField label="GPA / Score (optional)" id={`edu-score-${item.id}`}>
            <Input
              id={`edu-score-${item.id}`}
              value={item.score ?? ""}
              onInput={(v) => updateField(item.id, "score", v)}
              placeholder="3.8 / 4.0"
            />
          </FormField>
        </div>
      )}
    />
  );
};

export default EducationForm;
