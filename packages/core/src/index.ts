// The browser-safe resume logic shared by every Tailory surface. Nothing here touches storage,
// the network, the filesystem, or the DOM. The text parser lives at `@tailory/core/parser` so
// callers can load it lazily, and test fixtures live at `@tailory/core/testing`.
export * from "./export/pdf-renderer.ts";
export * from "./export/template-helpers.ts";
export * from "./export/template-types.ts";
export * from "./resume/design.ts";
export * from "./resume/json.ts";
export * from "./resume/normalize.ts";
export * from "./templates/compact-ats.ts";
export * from "./templates/minimal.ts";
export * from "./templates/modern.ts";
export * from "./templates/registry.ts";
export * from "./templates/render-model.ts";
export * from "./templates/sample-resume.ts";
export * from "./templates/section-builders.ts";
export * from "./types/resume.ts";
export * from "./types/template.ts";
