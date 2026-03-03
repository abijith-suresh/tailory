import { type Component, createSignal, For } from "solid-js";
import { resume, setResume } from "@/store/resume";
import type { ResumeSkill } from "@/types/resume";

function newSkill(name: string): ResumeSkill {
  return { id: crypto.randomUUID(), name, keywords: [] };
}

const SkillsForm: Component = () => {
  const [inputValue, setInputValue] = createSignal("");

  const addSkill = () => {
    const name = inputValue().trim();
    if (!name) return;
    // Handle comma-separated entry
    const names = name
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setResume("skills", (s) => [...(s ?? []), ...names.map(newSkill)]);
    setInputValue("");
  };

  const removeSkill = (id: string) => {
    setResume("skills", (s) => (s ?? []).filter((skill) => skill.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div class="space-y-4">
      <div class="flex gap-2">
        <input
          type="text"
          value={inputValue()}
          onInput={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter or comma…"
          class="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={addSkill}
          class="rounded-md bg-[#1d6648] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#155236]"
        >
          Add
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <For each={resume.skills ?? []}>
          {(skill) => (
            <span class="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800">
              {skill.name}
              <button
                type="button"
                onClick={() => removeSkill(skill.id)}
                aria-label={`Remove ${skill.name}`}
                class="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </span>
          )}
        </For>
      </div>

      {(resume.skills?.length ?? 0) === 0 && (
        <p class="text-sm text-gray-400">No skills added yet. Type above to add skills.</p>
      )}
    </div>
  );
};

export default SkillsForm;
