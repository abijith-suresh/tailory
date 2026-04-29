# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2026-04-29

### Added

- Direct test coverage for uploaded file processing and supplemental resume-section rendering across preview and export flows.

### Fixed

- Preserved volunteer, awards, publications, interests, and references across parser and JSON Resume round-trips.
- Allowed export and preview rendering for supported non-core resume sections instead of treating them as empty content.
- Hardened autosave snapshot parsing to fail safely on malformed draft payloads.

## [0.6.0] - 2026-04-07

### Added

- Improved resume data pipeline and stronger JSON Resume normalization across import flows.

### Changed

- Tightened the structured data model for the latest pre-launch milestone.

## [0.5.0] - 2026-04-07

### Added

- Browser print flow for export fallback when PDF generation needs a simpler path.

### Fixed

- Reconstructed PDF resume parsing and hardened export templates for more reliable real-world resumes.

## [0.4.1] - 2026-03-29

### Changed

- Applied a UI and UX polish pass across the v1 editor experience.

### Fixed

- Hardened the non-UI foundations around parsing, editing, and export behavior.

## [0.4.0] - 2026-03-03

### Added

- Command Center editor redesign and SPA-style navigation that made Tailory feel like a cohesive app instead of a demo.

## [0.3.0] - 2026-03-02

### Added

- The first Grove marketing site with seven pages around the resume editor.

### Changed

- Replaced early landing-page experiments with a clearer public product surface.

## [0.2.0] - 2026-03-01

### Added

- Client-side PDF export, IndexedDB draft persistence, and stronger live-preview/template coverage for a complete save-edit-export loop.

## [0.1.0] - 2026-03-01

### Added

- First usable resume editor with client-side PDF and DOCX extraction, heuristic parsing, structured editing, and live preview.

[unreleased]: https://github.com/abijith-suresh/tailory/compare/v0.6.1...HEAD
[0.6.1]: https://github.com/abijith-suresh/tailory/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/abijith-suresh/tailory/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/abijith-suresh/tailory/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/abijith-suresh/tailory/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/abijith-suresh/tailory/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/abijith-suresh/tailory/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/abijith-suresh/tailory/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/abijith-suresh/tailory/releases/tag/v0.1.0
