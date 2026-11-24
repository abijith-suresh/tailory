import type { Autosave } from "./autosave";
import ExportMenu from "./ExportMenu";
import ResumeMenu from "./ResumeMenu";
import TemplateSelect from "./TemplateSelect";
import VersionTabs from "./VersionTabs";

function LogoMark() {
  return (
    <svg viewBox="-1 0 22 22" aria-hidden="true" class="size-6 shrink-0">
      <path d="M1 2h18v5h-6v13H7V7H1z" class="fill-primary" />
    </svg>
  );
}

/**
 * Logo, the resume's name and save state, version tabs, template and export. From lg it's one
 * row with the tabs in the middle; below that the tabs get their own row.
 */
export default function TopBar(props: { autosave: Autosave }) {
  return (
    <header class="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-line bg-canvas px-4 pt-2 lg:h-16 lg:flex-nowrap lg:gap-x-6 lg:py-0">
      <div class="flex min-w-0 flex-1 items-center gap-2 lg:min-w-max lg:basis-0 lg:gap-3">
        <a
          href="/"
          aria-label="Tailory home"
          class="flex size-11 shrink-0 items-center justify-center rounded-button md:size-9"
        >
          <LogoMark />
        </a>
        <ResumeMenu autosave={props.autosave} />
      </div>
      <div class="order-last -mx-4 w-[calc(100%+2rem)] border-t border-line px-3 py-1 lg:order-none lg:mx-0 lg:w-auto lg:min-w-0 lg:border-t-0 lg:p-0">
        <VersionTabs />
      </div>
      <div class="flex shrink-0 items-center justify-end gap-2 lg:min-w-max lg:flex-1 lg:basis-0">
        <TemplateSelect id="template-select" class="max-md:hidden" />
        <ExportMenu />
      </div>
    </header>
  );
}
