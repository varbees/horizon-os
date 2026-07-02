# Horizon Document Storage Rules

Horizon uses Vite for the frontend. Vite serves files placed in `public/` from
the root path during development and copies them into `dist` as-is during
production builds. Treat `public/` as web-visible.

## Public-safe

- Published lab READMEs and guides
- Public research artifacts
- Demo assets intended for browser viewing

## Private

Keep these under `.horizon/private-documents/`, which is ignored by git:

- Identity documents
- Registration certificates
- Signed authorization letters
- Banking, tax, and compliance PDFs
- Secrets, credentials, or screenshots containing private account data

If Horizon needs to reason over private documents, add a local-only ingestion
path that reads `.horizon/private-documents/` and writes redacted summaries into
the wiki instead of exposing originals through `public/`.
