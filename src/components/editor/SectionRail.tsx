import { For, Show } from "solid-js";

import {
  isSectionComplete,
  SECTION_DEFINITIONS,
  type SectionDefinition,
} from "@/lib/sections/registry";
import { countSection } from "@/lib/versions/counts";
import { activeVersion } from "@/store/editor";
import { activeSection, resume, setActiveSection } from "@/store/resume";

/**
 * On the master, how many entries a section has. In a version, how many it keeps, shown only when
 * it leaves some out.
 */
function countLabel(
  section: SectionDefinition
): { text: string; label: string; dropped: boolean } | null {
  if (!section.entries) return null;
  const version = activeVersion();
  const { kept, total } = countSection(resume, version, section.entries);
  if (total === 0) return null;
  if (!version) {
    return {
      text: String(total),
      label: total === 1 ? "1 entry" : `${total} entries`,
      dropped: false,
    };
  }
  if (kept === total) return null;
  return { text: `${kept}/${total}`, label: `${kept} of ${total} kept`, dropped: true };
}

/**
 * The resume's sections. A column beside the form from xl; a scrolling row above it below that.
 * In a version each section shows how many of its entries the version keeps.
 */
export default function SectionRail() {
  return (
    <nav aria-label="Sections" class="shrink-0 xl:w-52 xl:overflow-y-auto xl:py-4">
      <ul class="flex gap-1 overflow-x-auto px-3 py-2 pr-10 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] [scrollbar-width:none] xl:flex-col xl:overflow-visible xl:p-0 xl:px-3 xl:[mask-image:none]">
        <For each={SECTION_DEFINITIONS}>
          {(section) => {
            const count = () => countLabel(section);
            return (
              <li class="shrink-0">
                <button
                  type="button"
                  aria-current={activeSection() === section.id ? "true" : undefined}
                  classList={{ "text-fg-subtle!": !isSectionComplete(section.id, resume) }}
                  onClick={() => setActiveSection(section.id)}
                  class="relative flex h-11 w-full items-center justify-between gap-3 rounded-button px-3 text-left text-ui-sm text-fg-muted transition-colors hover:bg-selected hover:text-fg aria-[current=true]:bg-surface aria-[current=true]:text-fg aria-[current=true]:ring-1 aria-[current=true]:ring-line-strong md:h-9"
                >
                  <span class="whitespace-nowrap">{section.label}</span>
                  <Show when={count()}>
                    {(c) => (
                      <span
                        class="font-mono text-ui-xs"
                        classList={{ "text-keep": c().dropped, "text-fg-subtle": !c().dropped }}
                      >
                        <span aria-hidden="true">{c().text}</span>
                        <span class="sr-only">, {c().label}</span>
                      </span>
                    )}
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </nav>
  );
}
