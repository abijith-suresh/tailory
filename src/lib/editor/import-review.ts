import type { ImportFeedback } from "@/store/resume";

export function getImportConfidenceState(score: number): {
  accent: string;
  border: string;
  label: string;
} {
  if (score >= 80) {
    return {
      label: "High parse confidence",
      accent: "#1d6648",
      border: "#bbf7d0",
    };
  }

  if (score >= 50) {
    return {
      label: "Medium parse confidence",
      accent: "#b45309",
      border: "#fcd34d",
    };
  }

  return {
    label: "Low parse confidence",
    accent: "#b91c1c",
    border: "#fca5a5",
  };
}

export function formatImportReviewCounts(feedback: ImportFeedback): string {
  const parts: string[] = [];

  if (feedback.work > 0) {
    parts.push(`${feedback.work} job${feedback.work > 1 ? "s" : ""}`);
  }

  if (feedback.education > 0) {
    parts.push(`${feedback.education} education entr${feedback.education > 1 ? "ies" : "y"}`);
  }

  if (feedback.skills > 0) {
    parts.push(`${feedback.skills} skill${feedback.skills > 1 ? "s" : ""}`);
  }

  if (feedback.projects > 0) {
    parts.push(`${feedback.projects} project${feedback.projects > 1 ? "s" : ""}`);
  }

  if (feedback.certificates > 0) {
    parts.push(`${feedback.certificates} certificate${feedback.certificates > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return "Imported content is available to review section by section.";
  }

  if (parts.length === 1) {
    return `Imported ${parts[0]}.`;
  }

  return `Imported ${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}.`;
}
