import { type Component, createSignal, For, Show } from "solid-js";

import { iconButton, outlineButton } from "@/components/ui/buttons";
import { inputClass } from "@/components/ui/Input";
import { Close } from "@/components/ui/icons";
import Tickbox from "@/components/ui/Tickbox";
import { createId } from "@/lib/resume/ids";
import { deleteEntry, toggleExcluded } from "@/store/document";
import { activeVersion, keepOnlyInActiveVersion } from "@/store/editor";
import { resume, setResume } from "@/store/resume";
import type { ResumeSkill } from "@/types/resume";

function newSkill(name: string): ResumeSkill {
  return { id: createId(), name, keywords: [] };
}

const SkillsForm: Component = () => {
  const [inputValue, setInputValue] = createSignal("");

  const addSkill = () => {
    const names = inputValue()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const skills = names.map(newSkill);
    setResume("skills", (list) => [...(list ?? []), ...skills]);
    for (const skill of skills) keepOnlyInActiveVersion(skill.id);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  const isKept = (skill: ResumeSkill) => !activeVersion()?.excluded.includes(skill.id);

  return (
    <div class="space-y-4">
      <div>
        <label for="skills-input" class="mb-1 block text-ui-sm">
          Add skills
        </label>
        <div class="flex gap-2">
          <input
            id="skills-input"
            name="skills"
            type="text"
            autocomplete="off"
            value={inputValue()}
            onInput={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="TypeScript, SQL, Figma"
            aria-describedby="skills-input-hint"
            class={`min-w-0 flex-1 ${inputClass}`}
          />
          <button type="button" onClick={addSkill} class={outlineButton}>
            Add
          </button>
        </div>
        <p id="skills-input-hint" class="mt-1 text-body-xs text-fg-subtle">
          Press Enter or type a comma after each one.
        </p>
      </div>

      <Show
        when={(resume.skills?.length ?? 0) > 0}
        fallback={<p class="text-body-sm text-fg-muted">No skills yet.</p>}
      >
        <ul class="flex flex-wrap gap-2" aria-label="Skills">
          <For each={resume.skills ?? []}>
            {(skill) => (
              <li class="flex max-w-full min-w-0 items-center rounded-lg bg-surface ring-1 ring-line">
                <Show
                  when={activeVersion()}
                  fallback={
                    <>
                      <span class="min-w-0 py-2 pl-3 text-ui-sm break-words">{skill.name}</span>
                      <button
                        type="button"
                        onClick={() => deleteEntry("skills", skill.id)}
                        aria-label={`Remove ${skill.name}`}
                        class={`${iconButton} hover:text-danger`}
                      >
                        <Close />
                      </button>
                    </>
                  }
                >
                  {(version) => (
                    <Tickbox
                      checked={isKept(skill)}
                      onChange={() => toggleExcluded(version().id, skill.id)}
                      class="px-3"
                    >
                      <span
                        class="text-ui-sm"
                        classList={{ "text-fg-subtle line-through decoration-cut": !isKept(skill) }}
                      >
                        {skill.name}
                      </span>
                    </Tickbox>
                  )}
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
};

export default SkillsForm;
