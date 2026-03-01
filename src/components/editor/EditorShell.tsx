import { type Component, createSignal, type JSX } from "solid-js";
import BasicsForm from "./BasicsForm";
import SummaryForm from "./SummaryForm";
import WorkForm from "./WorkForm";
import EducationForm from "./EducationForm";
import SkillsForm from "./SkillsForm";
import ProjectsForm from "./ProjectsForm";
import CertificatesForm from "./CertificatesForm";
import DraftManager from "./DraftManager";

type TabId = "basics" | "summary" | "work" | "education" | "skills" | "projects" | "certs";

interface Tab {
  id: TabId;
  label: string;
  component: () => JSX.Element;
}

const TABS: Tab[] = [
  { id: "basics", label: "Basics", component: () => <BasicsForm /> },
  { id: "summary", label: "Summary", component: () => <SummaryForm /> },
  { id: "work", label: "Work", component: () => <WorkForm /> },
  { id: "education", label: "Education", component: () => <EducationForm /> },
  { id: "skills", label: "Skills", component: () => <SkillsForm /> },
  { id: "projects", label: "Projects", component: () => <ProjectsForm /> },
  { id: "certs", label: "Certs", component: () => <CertificatesForm /> },
];

const EditorShell: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>("basics");

  const currentTab = () => TABS.find((t) => t.id === activeTab());

  return (
    <div class="flex h-full flex-col">
      {/* Tab bar */}
      <div class="sticky top-0 z-10 flex border-b border-gray-200 bg-white overflow-x-auto">
        {TABS.map((tab) => (
          <button
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab() === tab.id}
            aria-controls={`panel-${tab.id}`}
            role="tab"
            class={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab() === tab.id
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div id={`panel-${activeTab()}`} role="tabpanel" class="flex-1 overflow-y-auto p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-semibold text-gray-800">{currentTab()?.label}</h2>
          <DraftManager />
        </div>
        {currentTab()?.component()}
      </div>
    </div>
  );
};

export default EditorShell;
