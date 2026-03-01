import { For, Show, type Component } from "solid-js";
import { resume, selectedTemplate, setSelectedTemplate } from "@/store/resume";
import type { TemplateId } from "@/types/resume";
import { exportPDF } from "@/lib/export/pdf-export";

const TEMPLATES: { id: TemplateId; label: string; description: string }[] = [
  { id: "modern", label: "Modern", description: "Two-tone header, section dividers" },
  { id: "minimal", label: "Minimal", description: "Clean whitespace, no decoration" },
  { id: "compact-ats", label: "Compact ATS", description: "Dense, keyword-optimized" },
];

const ResumePreview: Component = () => {
  const handleExport = async () => {
    await exportPDF(JSON.parse(JSON.stringify(resume)), selectedTemplate());
  };

  return (
    <div class="flex h-full flex-col">
      {/* Controls */}
      <div class="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <div class="flex gap-2">
          <For each={TEMPLATES}>
            {(tpl) => (
              <button
                type="button"
                onClick={() => setSelectedTemplate(tpl.id)}
                aria-pressed={selectedTemplate() === tpl.id}
                title={tpl.description}
                class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTemplate() === tpl.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tpl.label}
              </button>
            )}
          </For>
        </div>
        <button
          type="button"
          onClick={handleExport}
          class="ml-auto rounded-md bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-500"
        >
          Export PDF
        </button>
      </div>

      {/* Preview */}
      <div class="flex-1 overflow-y-auto p-8">
        <div
          class="mx-auto max-w-[680px] rounded-sm bg-white p-10 shadow-lg text-xs leading-relaxed"
          style={{ "font-family": "Helvetica, Arial, sans-serif", "min-height": "842px" }}
        >
          <HtmlPreview template={selectedTemplate()} />
        </div>
      </div>
    </div>
  );
};

// ── HTML Resume Preview ──────────────────────────────────────────────────────

interface HtmlPreviewProps {
  template: TemplateId;
}

const HtmlPreview: Component<HtmlPreviewProps> = (props) => {
  const headerClass = () =>
    props.template === "modern"
      ? "mb-4 pb-3 border-b-2 border-indigo-600"
      : props.template === "compact-ats"
        ? "mb-2"
        : "mb-6";

  const sectionClass = () =>
    props.template === "compact-ats" ? "mb-3" : "mb-5";

  const titleClass = () =>
    props.template === "modern"
      ? "text-xs font-bold uppercase tracking-widest text-indigo-700 mb-1 border-b border-indigo-300 pb-0.5"
      : props.template === "compact-ats"
        ? "text-xs font-bold uppercase underline mb-1"
        : "text-xs font-bold uppercase tracking-widest text-gray-500 mb-1";

  const nameSize = () =>
    props.template === "compact-ats" ? "text-lg" : "text-2xl";

  return (
    <div class="text-gray-900">
      {/* Header */}
      <div class={headerClass()}>
        <h1 class={`font-bold ${nameSize()} leading-tight`}>
          {resume.basics.name || "Your Name"}
        </h1>
        <Show when={resume.basics.label}>
          <p class="text-gray-500 text-xs mt-0.5">{resume.basics.label}</p>
        </Show>
        <p class="text-gray-500 text-xs mt-1">
          {[
            resume.basics.email,
            resume.basics.phone,
            resume.basics.location?.city
              ? `${resume.basics.location.city}${resume.basics.location.region ? ", " + resume.basics.location.region : ""}`
              : null,
          ]
            .filter(Boolean)
            .join(" | ")}
        </p>
        <Show when={resume.basics.url}>
          <p class="text-xs text-indigo-600">{resume.basics.url}</p>
        </Show>
      </div>

      {/* Summary */}
      <Show when={resume.basics.summary}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Summary</h2>
          <p class="leading-relaxed text-gray-700">{resume.basics.summary}</p>
        </div>
      </Show>

      {/* Work */}
      <Show when={(resume.work?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Experience</h2>
          <For each={resume.work}>
            {(job) => (
              <div class="mb-2">
                <div class="flex justify-between items-baseline">
                  <span class="font-semibold text-xs">{job.name}</span>
                  <span class="text-gray-400 text-xs">
                    {[job.startDate, job.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={job.position}>
                  <p class="text-gray-600 italic text-xs">{job.position}</p>
                </Show>
                <Show when={(job.highlights?.length ?? 0) > 0}>
                  <ul class="mt-1 space-y-0.5 list-disc list-inside text-gray-700">
                    <For each={job.highlights}>
                      {(h) => <li class="leading-snug">{h}</li>}
                    </For>
                  </ul>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Education */}
      <Show when={(resume.education?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Education</h2>
          <For each={resume.education}>
            {(edu) => (
              <div class="mb-2">
                <div class="flex justify-between items-baseline">
                  <span class="font-semibold text-xs">{edu.institution}</span>
                  <span class="text-gray-400 text-xs">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={edu.studyType || edu.area}>
                  <p class="text-gray-600 italic text-xs">
                    {[edu.studyType, edu.area].filter(Boolean).join(", ")}
                  </p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Skills */}
      <Show when={(resume.skills?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Skills</h2>
          <p class="text-gray-700">
            {resume.skills!.map((s) => s.name).join(" · ")}
          </p>
        </div>
      </Show>

      {/* Projects */}
      <Show when={(resume.projects?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Projects</h2>
          <For each={resume.projects}>
            {(proj) => (
              <div class="mb-2">
                <span class="font-semibold text-xs">{proj.name}</span>
                <Show when={proj.url}>
                  <span class="ml-2 text-indigo-600 text-xs">{proj.url}</span>
                </Show>
                <Show when={proj.description}>
                  <p class="text-gray-600 italic text-xs">{proj.description}</p>
                </Show>
                <Show when={(proj.highlights?.length ?? 0) > 0}>
                  <ul class="mt-0.5 list-disc list-inside text-gray-700 space-y-0.5">
                    <For each={proj.highlights}>
                      {(h) => <li class="leading-snug">{h}</li>}
                    </For>
                  </ul>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Certificates */}
      <Show when={(resume.certificates?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Certifications</h2>
          <For each={resume.certificates}>
            {(cert) => (
              <div class="flex justify-between mb-1">
                <span class="text-xs">{cert.name}</span>
                <span class="text-gray-400 text-xs">{cert.date}</span>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={!resume.basics.name && (resume.work?.length ?? 0) === 0}>
        <div class="flex flex-col items-center justify-center py-16 text-gray-400">
          <p class="text-sm">Start editing to see your resume here</p>
        </div>
      </Show>
    </div>
  );
};

export default ResumePreview;
