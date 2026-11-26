// The resume logic shared by every Tailory surface: the resume model, applications and how they
// resolve to a printed resume, page fit, and PDF document definitions. Nothing here touches
// storage, the network, the filesystem, or the DOM; laying out a PDF to measure it is injected.
// The text parser lives at `@tailory/core/parser` so callers can load it lazily, and test fixtures
// live at `@tailory/core/testing`.
export * from "./applications/application.ts";
export * from "./applications/counts.ts";
export * from "./applications/items.ts";
export * from "./applications/resolve.ts";
export * from "./applications/section-order.ts";
export * from "./export/pdf-document.ts";
export * from "./export/pdf-renderer.ts";
export * from "./export/template-helpers.ts";
export * from "./export/template-types.ts";
export * from "./fit/fit.ts";
export * from "./fit/measure.ts";
export * from "./fit/steps.ts";
export * from "./resume/design.ts";
export * from "./resume/ids.ts";
export * from "./resume/json.ts";
export * from "./resume/normalize.ts";
export * from "./templates/compact-ats.ts";
export * from "./templates/minimal.ts";
export * from "./templates/modern.ts";
export * from "./templates/registry.ts";
export * from "./templates/render-model.ts";
export * from "./templates/sample-resume.ts";
export * from "./templates/section-builders.ts";
export * from "./types/application.ts";
export * from "./types/resume.ts";
export * from "./types/template.ts";
