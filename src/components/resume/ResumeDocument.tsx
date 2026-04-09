import { type Component, For, type JSX, Show, splitProps } from "solid-js";

import { buildResumeRenderModel } from "@/lib/templates/registry";
import type { ResumeDesignSettings } from "@/lib/resume/design";
import type { ResumeEntryModel, ResumeSectionModel } from "@/lib/templates/render-model";
import type { ResumeSchema } from "@/types/resume";

export interface ResumeDocumentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  design: ResumeDesignSettings;
  resume: ResumeSchema;
}

function renderSectionTitle(
  section: ResumeSectionModel,
  template: ResumeDesignSettings["template"],
  accentColor: string
) {
  if (template === "modern") {
    return (
      <h2
        class="resume-document__section-title mb-1 border-b pb-0.5 text-xs font-bold uppercase tracking-widest"
        style={{ color: accentColor, "border-color": "#ccddd4" }}
      >
        {section.title}
      </h2>
    );
  }

  if (template === "compact-ats") {
    return (
      <h2
        class="resume-document__section-title mb-1 text-xs font-bold uppercase underline"
        style={{ color: accentColor }}
      >
        {section.title}
      </h2>
    );
  }

  return (
    <h2
      class="resume-document__section-title mb-1 text-xs font-bold uppercase tracking-widest"
      style={{ color: accentColor }}
    >
      {section.title}
    </h2>
  );
}

function renderEntry(
  entry: ResumeEntryModel,
  template: ResumeDesignSettings["template"],
  accentColor: string
) {
  const titleClass =
    template === "compact-ats"
      ? entry.subtitle
        ? "resume-document__entry-title text-xs font-semibold"
        : "resume-document__entry-title text-[13px]"
      : "resume-document__entry-title text-xs font-semibold";

  return (
    <div class={`resume-document__entry ${template === "compact-ats" ? "mb-1.5" : "mb-2"}`}>
      <div class="resume-document__entry-header flex items-baseline justify-between gap-4">
        <span class={titleClass}>
          {entry.title}
          <Show when={entry.subtitle && entry.subtitleMode === "inline"}>
            <span class="text-gray-600"> {`- ${entry.subtitle}`}</span>
          </Show>
        </span>
        <Show when={entry.meta}>
          <span class="resume-document__entry-date shrink-0 text-xs text-gray-400">
            {entry.meta}
          </span>
        </Show>
      </div>
      <Show when={entry.subtitle && entry.subtitleMode === "stacked"}>
        <p class="resume-document__entry-subtitle text-xs italic text-gray-600">{entry.subtitle}</p>
      </Show>
      <Show when={entry.body}>
        <p class="resume-document__entry-text mt-1 text-gray-700">{entry.body}</p>
      </Show>
      <For each={entry.details ?? []}>
        {(detail) => <p class="resume-document__entry-text text-gray-700">{detail}</p>}
      </For>
      <Show when={(entry.bullets?.length ?? 0) > 0}>
        <ul class="resume-document__highlights mt-1 space-y-0.5 text-gray-700">
          <For each={entry.bullets}>
            {(highlight) => (
              <li class="resume-document__highlight flex gap-2 leading-snug">
                <span aria-hidden="true">-</span>
                <span>{highlight}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={entry.link}>
        <p class="resume-document__link mt-0.5 text-xs" style={{ color: accentColor }}>
          {entry.link}
        </p>
      </Show>
    </div>
  );
}

const ResumeDocument: Component<ResumeDocumentProps> = (props) => {
  const [local, rest] = splitProps(props, ["class", "design", "resume"]);

  const model = () => buildResumeRenderModel(local.resume, local.design);
  const headerClass = () =>
    local.design.template === "modern"
      ? "resume-document__header mb-4 border-b-2 pb-3"
      : local.design.template === "compact-ats"
        ? "resume-document__header mb-2"
        : "resume-document__header mb-6";
  const sectionClass = () =>
    `resume-document__section ${local.design.template === "compact-ats" ? "mb-3" : "mb-5"}`;
  const nameClass = () =>
    local.design.template === "compact-ats"
      ? "resume-document__name text-lg font-bold leading-tight"
      : "resume-document__name text-2xl font-bold leading-tight";

  return (
    <div
      {...rest}
      class={`resume-document resume-document--${local.design.template} ${local.class ?? ""}`.trim()}
      style={{ "--resume-accent": local.design.accentColor }}
    >
      <div
        class={headerClass()}
        style={
          local.design.template === "modern" ? { "border-color": local.design.accentColor } : {}
        }
      >
        <h1 class={nameClass()}>{model().header.name || "Your Name"}</h1>
        <Show when={model().header.label}>
          <p class="resume-document__label mt-0.5 text-xs text-gray-500">{model().header.label}</p>
        </Show>
        <Show when={model().header.contactLine}>
          <p class="resume-document__contact mt-1 text-xs text-gray-500">
            {model().header.contactLine}
          </p>
        </Show>
        <Show when={model().header.urlLine}>
          <p class="resume-document__link text-xs" style={{ color: local.design.accentColor }}>
            {model().header.urlLine}
          </p>
        </Show>
        <Show when={model().header.dividerAfter}>
          <div class="mt-2 border-b" style={{ "border-color": "#d1d5db" }} />
        </Show>
      </div>

      <For each={model().sections}>
        {(section) => (
          <section class={sectionClass()}>
            {renderSectionTitle(section, local.design.template, local.design.accentColor)}
            <Show
              when={section.kind === "text"}
              fallback={
                <For each={section.entries ?? []}>
                  {(entry) => renderEntry(entry, local.design.template, local.design.accentColor)}
                </For>
              }
            >
              <p class="resume-document__entry-text leading-relaxed text-gray-700">
                {section.text}
              </p>
            </Show>
            <Show when={section.dividerAfter}>
              <div class="mt-2 border-b" style={{ "border-color": "#d1d5db" }} />
            </Show>
          </section>
        )}
      </For>
    </div>
  );
};

export default ResumeDocument;
