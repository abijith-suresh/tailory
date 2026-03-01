import type { Component } from "solid-js";
import { resume, setResume } from "@/store/resume";
import FormField from "@/components/ui/FormField";
import Textarea from "@/components/ui/Textarea";

const SummaryForm: Component = () => (
  <div class="space-y-4">
    <FormField
      label="Professional Summary"
      id="summary"
      hint="2–4 sentences highlighting your top skills, experience, and career goals."
    >
      <Textarea
        id="summary"
        value={resume.basics.summary ?? ""}
        onInput={(v) => setResume("basics", "summary", v)}
        placeholder="Results-driven software engineer with 5+ years of experience…"
        rows={6}
      />
    </FormField>
  </div>
);

export default SummaryForm;
