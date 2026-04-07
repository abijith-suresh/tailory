import { type Component, For, type JSX, Show, splitProps } from "solid-js";

import type { ResumeSchema, TemplateId } from "@/types/resume";

export interface ResumeDocumentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
  resume: ResumeSchema;
  template: TemplateId;
}

function formatLocation(resume: ResumeSchema): string | null {
  const city = resume.basics.location?.city?.trim();
  const region = resume.basics.location?.region?.trim();
  const combined = [city, region].filter(Boolean).join(", ");

  return combined || null;
}

function joinDefined(parts: Array<string | undefined | null>, separator: string): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(separator);
}

const ResumeDocument: Component<ResumeDocumentProps> = (props) => {
  const [local, rest] = splitProps(props, ["accentColor", "class", "resume", "template"]);

  const accentColor = () => local.accentColor ?? "#1d6648";
  const location = () => formatLocation(local.resume);
  const contactLine = () =>
    joinDefined([local.resume.basics.email, local.resume.basics.phone, location()], " | ");
  const headerClass = () =>
    local.template === "modern"
      ? "resume-document__header mb-4 border-b-2 pb-3"
      : local.template === "compact-ats"
        ? "resume-document__header mb-2"
        : "resume-document__header mb-6";
  const sectionClass = () =>
    `resume-document__section ${local.template === "compact-ats" ? "mb-3" : "mb-5"}`;
  const titleClass = () =>
    local.template === "modern"
      ? "resume-document__section-title mb-1 border-b pb-0.5 text-xs font-bold uppercase tracking-widest"
      : local.template === "compact-ats"
        ? "resume-document__section-title mb-1 text-xs font-bold uppercase underline"
        : "resume-document__section-title mb-1 text-xs font-bold uppercase tracking-widest text-gray-500";
  const nameClass = () =>
    local.template === "compact-ats"
      ? "resume-document__name text-lg font-bold leading-tight"
      : "resume-document__name text-2xl font-bold leading-tight";

  return (
    <div
      {...rest}
      class={`resume-document resume-document--${local.template} ${local.class ?? ""}`.trim()}
      style={{ "--resume-accent": accentColor() }}
    >
      <div
        class={headerClass()}
        style={local.template === "modern" ? { "border-color": accentColor() } : {}}
      >
        <h1 class={nameClass()}>{local.resume.basics.name || "Your Name"}</h1>
        <Show when={local.resume.basics.label}>
          <p class="resume-document__label mt-0.5 text-xs text-gray-500">
            {local.resume.basics.label}
          </p>
        </Show>
        <Show when={contactLine()}>
          <p class="resume-document__contact mt-1 text-xs text-gray-500">{contactLine()}</p>
        </Show>
        <Show when={local.resume.basics.url}>
          <p class="resume-document__link text-xs" style={{ color: accentColor() }}>
            {local.resume.basics.url}
          </p>
        </Show>
      </div>

      <Show when={local.resume.basics.summary}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Summary
          </h2>
          <p class="resume-document__entry-text leading-relaxed text-gray-700">
            {local.resume.basics.summary}
          </p>
        </section>
      </Show>

      <Show when={(local.resume.work?.length ?? 0) > 0}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Experience
          </h2>
          <For each={local.resume.work}>
            {(job) => (
              <div class="resume-document__entry mb-2">
                <div class="resume-document__entry-header flex items-baseline justify-between gap-4">
                  <span class="resume-document__entry-title text-xs font-semibold">{job.name}</span>
                  <span class="resume-document__entry-date shrink-0 text-xs text-gray-400">
                    {[job.startDate, job.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={job.position}>
                  <p class="resume-document__entry-subtitle text-xs italic text-gray-600">
                    {job.position}
                  </p>
                </Show>
                <Show when={job.summary}>
                  <p class="resume-document__entry-text mt-1 text-gray-700">{job.summary}</p>
                </Show>
                <Show when={(job.highlights?.length ?? 0) > 0}>
                  <ul class="resume-document__highlights mt-1 space-y-0.5 text-gray-700">
                    <For each={job.highlights}>
                      {(highlight) => (
                        <li class="resume-document__highlight flex gap-2 leading-snug">
                          <span aria-hidden="true">-</span>
                          <span>{highlight}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            )}
          </For>
        </section>
      </Show>

      <Show when={(local.resume.education?.length ?? 0) > 0}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Education
          </h2>
          <For each={local.resume.education}>
            {(education) => (
              <div class="resume-document__entry mb-2">
                <div class="resume-document__entry-header flex items-baseline justify-between gap-4">
                  <span class="resume-document__entry-title text-xs font-semibold">
                    {education.institution}
                  </span>
                  <span class="resume-document__entry-date shrink-0 text-xs text-gray-400">
                    {[education.startDate, education.endDate].filter(Boolean).join(" – ")}
                  </span>
                </div>
                <Show when={education.studyType || education.area}>
                  <p class="resume-document__entry-subtitle text-xs italic text-gray-600">
                    {[education.studyType, education.area].filter(Boolean).join(", ")}
                  </p>
                </Show>
                <Show when={education.score}>
                  <p class="resume-document__entry-text text-gray-700">GPA: {education.score}</p>
                </Show>
              </div>
            )}
          </For>
        </section>
      </Show>

      <Show when={(local.resume.skills?.length ?? 0) > 0}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Skills
          </h2>
          <p class="resume-document__skills text-gray-700">
            {local.resume.skills?.map((skill) => skill.name).join(" · ")}
          </p>
        </section>
      </Show>

      <Show when={(local.resume.projects?.length ?? 0) > 0}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Projects
          </h2>
          <For each={local.resume.projects}>
            {(project) => (
              <div class="resume-document__entry mb-2">
                <div class="resume-document__entry-header flex items-baseline justify-between gap-4">
                  <span class="resume-document__entry-title text-xs font-semibold">
                    {project.name}
                  </span>
                  <Show when={project.url}>
                    <span class="resume-document__link text-xs" style={{ color: accentColor() }}>
                      {project.url}
                    </span>
                  </Show>
                </div>
                <Show when={project.description}>
                  <p class="resume-document__entry-subtitle text-xs italic text-gray-600">
                    {project.description}
                  </p>
                </Show>
                <Show when={(project.highlights?.length ?? 0) > 0}>
                  <ul class="resume-document__highlights mt-0.5 space-y-0.5 text-gray-700">
                    <For each={project.highlights}>
                      {(highlight) => (
                        <li class="resume-document__highlight flex gap-2 leading-snug">
                          <span aria-hidden="true">-</span>
                          <span>{highlight}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            )}
          </For>
        </section>
      </Show>

      <Show when={(local.resume.certificates?.length ?? 0) > 0}>
        <section class={sectionClass()}>
          <h2
            class={titleClass()}
            style={
              local.template === "modern"
                ? { color: accentColor(), "border-color": "#ccddd4" }
                : { color: local.template === "compact-ats" ? undefined : accentColor() }
            }
          >
            Certifications
          </h2>
          <For each={local.resume.certificates}>
            {(certificate) => (
              <div class="resume-document__entry mb-1">
                <div class="resume-document__entry-header flex items-baseline justify-between gap-4">
                  <span class="resume-document__entry-title text-xs">{certificate.name}</span>
                  <span class="resume-document__entry-date shrink-0 text-xs text-gray-400">
                    {certificate.date}
                  </span>
                </div>
                <Show when={certificate.issuer}>
                  <p class="resume-document__entry-subtitle text-xs italic text-gray-600">
                    {certificate.issuer}
                  </p>
                </Show>
              </div>
            )}
          </For>
        </section>
      </Show>
    </div>
  );
};

export default ResumeDocument;
