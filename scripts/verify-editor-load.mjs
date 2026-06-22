// Backward-compatible entrypoint.
// The editor now manages multiple files under resumes/, so the old single
// index.html load check is covered by the full workflow regression.
await import('./verify-editor-workflows.mjs');
