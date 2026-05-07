# JSON Resume compatibility

Tailory supports **JSON Resume-style** import and export for the fields it currently models in its own resume schema.

## Supported top-level sections

Tailory currently accepts and exports these top-level sections:

- `basics`
- `work`
- `volunteer`
- `education`
- `awards`
- `certificates`
- `publications`
- `skills`
- `languages`
- `interests`
- `references`
- `projects`

## Metadata fields

Tailory ignores these common non-content fields during import:

- `$schema`
- `meta`

## Compatibility rules

- Tailory normalizes supported content into its internal resume schema on import.
- Internal entry IDs are removed again during export.
- Unknown top-level fields fail fast with an actionable error instead of being silently dropped.
- Empty or malformed section shapes fail with explicit validation messages.
- Tailory does **not** currently claim full validation against the upstream official JSON Resume schema package.

## Editor coverage vs data coverage

Not every supported JSON Resume field is fully editable in the current form UI.

Today Tailory can already preserve and render more schema-backed content than the editor exposes directly. In practice that means some sections may:

- import successfully
- survive normalization and JSON export
- appear in preview and PDF export
- still lack first-class editor controls

## What to expect from invalid files

Tailory rejects JSON files when:

- the top-level document is not an object
- a supported section has the wrong shape, such as `work` being an object instead of an array
- the document is missing basic identity information such as `basics.name`, `basics.email`, or `basics.label`
- the document includes unsupported top-level fields that Tailory would otherwise have to drop
