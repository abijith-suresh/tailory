import { For } from "solid-js";

import { ChevronDown } from "@/components/ui/icons";
import { TEMPLATE_OPTIONS } from "@/lib/templates/registry";
import { currentTemplate, setCurrentTemplate } from "@/store/editor";
import type { TemplateId } from "@/types/template";

/** The open version's template. On the master it sets the template new versions start with. */
export default function TemplateSelect(props: { id: string; class?: string }) {
  return (
    <div class={`relative flex items-center gap-2 ${props.class ?? ""}`}>
      <label for={props.id} class="text-ui-sm text-fg-muted">
        Template
      </label>
      <select
        id={props.id}
        name="template"
        value={currentTemplate()}
        onChange={(event) => setCurrentTemplate(event.currentTarget.value as TemplateId)}
        class="btn-quiet h-11 cursor-pointer appearance-none bg-surface text-fg pr-8 pl-3 text-ui-sm ring-1 ring-line-strong ring-inset md:h-9"
      >
        <For each={TEMPLATE_OPTIONS}>
          {(template) => <option value={template.id}>{template.label}</option>}
        </For>
      </select>
      <ChevronDown class="pointer-events-none absolute right-3 text-fg-subtle" />
    </div>
  );
}
