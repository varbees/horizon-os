# X3 — Asset providers (NVIDIA NIM image + Gemini image/video) behind one interface

Run with `codex exec`. You are a senior Node engineer adding non-MCP asset providers so the
generate lane has fallbacks and choices beyond the HuggingFace/Higgsfield MCP path.

## Read first
- NVIDIA NIM (OpenAI-compatible image endpoints): https://build.nvidia.com and the existing `scripts/nim.mjs` (chat shim to extend).
- Gemini API (image + video generation, structured output): https://ai.google.dev/gemini-api/docs — and the existing `scripts/gemini.mjs`.
- Provider catalog pattern: `scripts/llm-providers.mjs`. Keys load via `scripts/env.mjs` (`GEMINI_API_KEY`, `NVIDIA_NIM_API_KEY`) — server-side only.

## Build
1. A uniform `generateAsset({ provider, kind, prompt, negative_prompt, aspect_ratio })` interface that returns `{ ok, result_url|local_path, manifest, error }`, with adapters:
   - `nim`: still image generation via the NIM image endpoint.
   - `gemini`: still image and short video via the Gemini API.
   - (MCP `huggingface`/`higgsfield` remain in `scripts/content-pipeline.mjs` from X2 — this interface is for the API-key providers.)
2. Wire `generateAsset` into the X2 generate lane so `content_assets.provider` selects the path.
3. Save binaries under `.horizon/assets/<brief_id>/` and record `local_path`; keep large blobs out of SQLite (store the path + a manifest only).
4. Graceful when a key is missing: return `{ ok:false, error:"provider_key_missing", provider }` (do not throw); the UI surfaces it.

## Constraints
- Keys server-side only; never shipped to the browser. No key in logs.
- Do not hardwire Horizon to any CLI as a production backbone; use the HTTP APIs for the pipeline.
- Reuse the existing provider files; do not duplicate the auth/header logic.

## Acceptance criteria
- `generateAsset({provider:'nim',...})` and `{provider:'gemini',...}` each produce a saved asset and a `content_assets` row when keys are present, and a clean `provider_key_missing` when absent.
- No regression to the existing `scripts/gemini.mjs` / `scripts/nim.mjs` chat/enrichment callers.
- Note what shipped, paths, and the next action.
