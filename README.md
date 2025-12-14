# practical-prompt-engineering-code-exercise

This repo serves to hold the code generated from the Frontend Masters workshop Practical Prompt Engineering

## Export / Import

- Click the `Export` button in the header to download a JSON file containing all prompts and metadata. The file includes a `version` field for compatibility, an `exportedAt` timestamp, `stats`, and a `prompts` array.
- Click `Import` and choose a previously exported JSON file. You will be prompted for how to handle duplicate IDs: `merge`, `replace`, `skip`, or `ask` (per-item confirmation).
- Before importing, the app creates a localStorage backup key (prefixed with `promptLibrary.backup`) and will rollback to it if the import fails.

Notes:

- The export format version is `1.0`.
- Import validates the JSON structure and prompts must include an `id`, `title`, and `content`.
