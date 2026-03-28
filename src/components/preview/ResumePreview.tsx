import { type Component, For, Show } from "solid-js";

import { resume, selectedTemplate, setSelectedTemplate } from "@/store/resume";
import type { TemplateId } from "@/types/resume";

const TEMPLATES: { description: string; id: TemplateId; label: string }[] = [
  { id: "modern", label: "Modern", description: "Two-tone header, section dividers" },
  { id: "minimal", label: "Minimal", description: "Clean whitespace, no decoration" },
  { id: "compact-ats", label: "Compact ATS", description: "Dense, keyword-optimized" },
];

const TOTAL_SECTIONS = 7;
const CIRCUMFERENCE = 2 * Math.PI * 14;

const isEmpty = () =>
  !resume.basics.name &&
  !resume.basics.summary &&
  (resume.work?.length ?? 0) === 0 &&
  (resume.education?.length ?? 0) === 0 &&
  (resume.skills?.length ?? 0) === 0 &&
  (resume.projects?.length ?? 0) === 0 &&
  (resume.certificates?.length ?? 0) === 0;

const ResumePreview: Component = () => {
  const completedCount = () => {
    let count = 0;
    if (resume.basics.name) count++;
    if (resume.basics.summary) count++;
    if ((resume.work?.length ?? 0) > 0) count++;
    if ((resume.education?.length ?? 0) > 0) count++;
    if ((resume.skills?.length ?? 0) > 0) count++;
    if ((resume.projects?.length ?? 0) > 0) count++;
    if ((resume.certificates?.length ?? 0) > 0) count++;
    return count;
  };

  const ringDash = () => {
    const filled = (completedCount() / TOTAL_SECTIONS) * CIRCUMFERENCE;
    return `${filled} ${CIRCUMFERENCE - filled}`;
  };

  return (
    <div class="flex h-full flex-col">
      {/* Controls */}
      <div
        class="flex flex-wrap items-center gap-3 border-b px-6 py-3"
        style={{ background: "#ffffff", "border-color": "#ccddd4" }}
      >
        {/* Completeness ring */}
        <div
          class="flex items-center gap-2"
          aria-label={`${completedCount()} of ${TOTAL_SECTIONS} sections complete`}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="none" stroke="#ccddd4" stroke-width="3" />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="#1d6648"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray={ringDash()}
              transform="rotate(-90 16 16)"
            />
            <text
              x="16"
              y="16"
              text-anchor="middle"
              dominant-baseline="central"
              fill="#0e2418"
              font-size="9"
              font-family="'DM Sans', sans-serif"
              font-weight="600"
            >
              {completedCount()}/{TOTAL_SECTIONS}
            </text>
          </svg>
          <span class="text-xs" style={{ color: "#5a7a68" }}>
            complete
          </span>
        </div>

        <div class="flex gap-1.5">
          <For each={TEMPLATES}>
            {(tpl) => (
              <button
                type="button"
                onClick={() => setSelectedTemplate(tpl.id)}
                aria-pressed={selectedTemplate() === tpl.id}
                title={tpl.description}
                class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors active:scale-95 ${selectedTemplate() === tpl.id ? "" : "hover:bg-[#e6f0ea]"}`}
                style={
                  selectedTemplate() === tpl.id
                    ? { background: "#1d6648", color: "#ffffff" }
                    : {
                        background: "#f4f8f5",
                        color: "#3d5c49",
                        border: "1px solid #ccddd4",
                      }
                }
              >
                {tpl.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Preview area */}
      <Show
        when={!isEmpty()}
        fallback={
          <div class="flex flex-1 items-center justify-center p-8">
            <div class="max-w-xs text-center">
              {/* Document icon */}
              <div
                class="mx-auto mb-5 flex h-16 w-12 flex-col overflow-hidden rounded-sm shadow-sm"
                style={{ background: "#edf4f0", border: "1.5px solid #ccddd4" }}
                aria-hidden="true"
              >
                <div class="h-3 w-full" style={{ background: "#1d6648" }} />
                <div class="flex flex-1 flex-col gap-1.5 p-2">
                  <div class="h-1 w-full rounded-full" style={{ background: "#ccddd4" }} />
                  <div class="h-1 w-4/5 rounded-full" style={{ background: "#ccddd4" }} />
                  <div class="h-1 w-3/5 rounded-full" style={{ background: "#ccddd4" }} />
                  <div class="mt-0.5 h-1 w-full rounded-full" style={{ background: "#ccddd4" }} />
                  <div class="h-1 w-5/6 rounded-full" style={{ background: "#ccddd4" }} />
                </div>
              </div>

              <h2 class="mb-1.5 text-sm font-semibold" style={{ color: "#0e2418" }}>
                Your resume preview will appear here
              </h2>
              <p class="mb-5 text-xs leading-relaxed" style={{ color: "#5a7a68" }}>
                Fill in the <strong>Basics</strong> section on the left to get started, or import an
                existing PDF or DOCX file from the toolbar above.
              </p>

              <div
                class="rounded-md p-3 text-left text-xs leading-relaxed"
                style={{ background: "#edf4f0", border: "1px solid #ccddd4", color: "#3d6650" }}
              >
                <p class="mb-1.5 font-medium" style={{ color: "#1d6648" }}>
                  Quick start
                </p>
                <ol class="list-inside list-decimal space-y-1">
                  <li>Add your name and contact info in Basics</li>
                  <li>Write a short summary of your background</li>
                  <li>Add work experience, education, and skills</li>
                  <li>Click Export PDF when you're ready</li>
                </ol>
              </div>
            </div>
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto p-8">
          <div
            class="mx-auto max-w-[680px] rounded-sm bg-white p-10 text-xs leading-relaxed shadow-lg"
            style={{ "font-family": "Helvetica, Arial, sans-serif", "min-height": "842px" }}
          >
            <HtmlPreview template={selectedTemplate()} />
          </div>
        </div>
      </Show>
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
      ? "mb-4 pb-3 border-b-2 border-[#1d6648]"
      : props.template === "compact-ats"
        ? "mb-2"
        : "mb-6";

  const sectionClass = () => (props.template === "compact-ats" ? "mb-3" : "mb-5");

  const titleClass = () =>
    props.template === "modern"
      ? "text-xs font-bold uppercase tracking-widest text-[#1d6648] mb-1 border-b border-[#ccddd4] pb-0.5"
      : props.template === "compact-ats"
        ? "text-xs font-bold uppercase underline mb-1"
        : "text-xs font-bold uppercase tracking-widest text-gray-500 mb-1";

  const nameSize = () => (props.template === "compact-ats" ? "text-lg" : "text-2xl");

  return (
    <div class="text-gray-900">
      {/* Header */}
      <div class={headerClass()}>
        <h1 class={`font-bold ${nameSize()} leading-tight`}>{resume.basics.name || "Your Name"}</h1>
        <Show when={resume.basics.label}>
          <p class="mt-0.5 text-xs text-gray-500">{resume.basics.label}</p>
        </Show>
        <p class="mt-1 text-xs text-gray-500">
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
          <p class="text-xs" style={{ color: "#2d9469" }}>
            {resume.basics.url}
          </p>
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
                <div class="flex items-baseline justify-between">
                  <span class="text-xs font-semibold">{job.name}</span>
                  <span class="text-xs text-gray-400">
                    {[job.startDate, job.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={job.position}>
                  <p class="text-xs italic text-gray-600">{job.position}</p>
                </Show>
                <Show when={(job.highlights?.length ?? 0) > 0}>
                  <ul class="mt-1 list-inside list-disc space-y-0.5 text-gray-700">
                    <For each={job.highlights}>{(h) => <li class="leading-snug">{h}</li>}</For>
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
                <div class="flex items-baseline justify-between">
                  <span class="text-xs font-semibold">{edu.institution}</span>
                  <span class="text-xs text-gray-400">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={edu.studyType || edu.area}>
                  <p class="text-xs italic text-gray-600">
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
          <p class="text-gray-700">{resume.skills!.map((s) => s.name).join(" · ")}</p>
        </div>
      </Show>

      {/* Projects */}
      <Show when={(resume.projects?.length ?? 0) > 0}>
        <div class={sectionClass()}>
          <h2 class={titleClass()}>Projects</h2>
          <For each={resume.projects}>
            {(proj) => (
              <div class="mb-2">
                <span class="text-xs font-semibold">{proj.name}</span>
                <Show when={proj.url}>
                  <span class="ml-2 text-xs" style={{ color: "#2d9469" }}>
                    {proj.url}
                  </span>
                </Show>
                <Show when={proj.description}>
                  <p class="text-xs italic text-gray-600">{proj.description}</p>
                </Show>
                <Show when={(proj.highlights?.length ?? 0) > 0}>
                  <ul class="mt-0.5 list-inside list-disc space-y-0.5 text-gray-700">
                    <For each={proj.highlights}>{(h) => <li class="leading-snug">{h}</li>}</For>
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
              <div class="mb-1 flex justify-between">
                <span class="text-xs">{cert.name}</span>
                <span class="text-xs text-gray-400">{cert.date}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default ResumePreview;
