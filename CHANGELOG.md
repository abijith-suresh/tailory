# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0](https://github.com/abijith-suresh/tailory/compare/tailory-v0.6.1...tailory-v0.7.0) (2026-04-29)


### Features

* add 3 pdfmake templates and reactive live preview ([9a7c77f](https://github.com/abijith-suresh/tailory/commit/9a7c77f434dbfaa7254b402322d770cffab14fbd))
* add dependencies, scaffold structure, and define types ([e2446ac](https://github.com/abijith-suresh/tailory/commit/e2446ac33f573c9f034da707061a21b896c5ccf7))
* add Grove marketing site with 7 pages ([#3](https://github.com/abijith-suresh/tailory/issues/3)) ([a22c7a8](https://github.com/abijith-suresh/tailory/commit/a22c7a883faaa7d8e78735182aa0992b63c44da2))
* build complete editor UI with SolidJS components ([9e90747](https://github.com/abijith-suresh/tailory/commit/9e90747376a16b313e4510d479a5bea185866073))
* Command Center editor redesign ([#5](https://github.com/abijith-suresh/tailory/issues/5)) ([26cb4ec](https://github.com/abijith-suresh/tailory/commit/26cb4ec52f333148a82f02b6d7853d1cc0134f95))
* implement core extraction engine and resume parser ([2fc2744](https://github.com/abijith-suresh/tailory/commit/2fc274442f48bdc5b2c8b85be2797cfd27aafa81))
* implement PDF export and IndexedDB draft persistence ([2015170](https://github.com/abijith-suresh/tailory/commit/201517038c0cd144e292664aa4813574e406b59a))
* improve resume data pipeline ([#25](https://github.com/abijith-suresh/tailory/issues/25)) ([c00f1f6](https://github.com/abijith-suresh/tailory/commit/c00f1f66b3e02fb2afd287e645a43ea69f08fa62))
* make Tailory feel like a SPA ([#6](https://github.com/abijith-suresh/tailory/issues/6)) ([673b350](https://github.com/abijith-suresh/tailory/commit/673b3506f578dd5d3a96dd7ea3bd91bfb12dfd5b))
* polish — error boundary, a11y, mobile layout, focus styles ([be1339b](https://github.com/abijith-suresh/tailory/commit/be1339bf8d8ce3edbd4363b58bf7d1002e6a9da8))
* preserve supplemental resume sections across import and export ([#38](https://github.com/abijith-suresh/tailory/issues/38)) ([a0838d9](https://github.com/abijith-suresh/tailory/commit/a0838d947bac100ab4e13f8e354d2680b46920a2))
* UI/UX v1 polish pass ([#21](https://github.com/abijith-suresh/tailory/issues/21)) ([67713cb](https://github.com/abijith-suresh/tailory/commit/67713cb3d069aff46a586dadd769a99a757c5b35))


### Bug Fixes

* add responsive mobile header with hamburger side drawer ([#35](https://github.com/abijith-suresh/tailory/issues/35)) ([6fd2e30](https://github.com/abijith-suresh/tailory/commit/6fd2e30084c58b38263e8122bd1e2e898826ed50))
* harden non-UI v1 foundations ([#20](https://github.com/abijith-suresh/tailory/issues/20)) ([e8b23cc](https://github.com/abijith-suresh/tailory/commit/e8b23cc38844452582c62c4b946d59eb93ff6a50))
* harden resume export templates and add browser print flow ([#23](https://github.com/abijith-suresh/tailory/issues/23)) ([f9fa8e6](https://github.com/abijith-suresh/tailory/commit/f9fa8e636fb7feceaaaa37044b90869196b1489a))
* reconstruct pdf resume parsing ([#22](https://github.com/abijith-suresh/tailory/issues/22)) ([039ff88](https://github.com/abijith-suresh/tailory/commit/039ff8873285da879fe83969383dd1bd23440ecc))
* replace print-tab PDF export with direct client-side generation ([#37](https://github.com/abijith-suresh/tailory/issues/37)) ([33b20a8](https://github.com/abijith-suresh/tailory/commit/33b20a81d5c0d12594c70324b750e00aff589699))

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
