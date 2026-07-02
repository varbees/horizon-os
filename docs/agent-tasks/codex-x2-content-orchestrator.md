# X2 — Content orchestrator + forward lanes (asset plan → generate → assemble → publish)

Run with `codex exec`. You are a senior Node engineer completing the content pipeline forward of
the research lane. The research lane (`POST /api/content/briefs/:id/run` with `lane:"research"`)
already runs on Claude Code and writes `content_briefs.research_json`. Build the remaining lanes
and the endpoints the frontend client already calls.

## The frontend contract is already written — match it exactly
`src/lib/contentApi.js` defines the client calls you must satisfy:
- `addContentAsset(id, asset)` → `POST /api/content/briefs/:id/assets`
- `assembleContentPackage(id, body)` → `POST /api/content/briefs/:id/package`
- `markContentPublished(id, body)` → `POST /api/content/briefs/:id/publish`
- plus the existing `runContentLane(id, {lane})` for `asset_plan` and `assemble`.

Tables already exist (migration v4): `content_assets`, `content_packages`, `pipeline_runs`.
Prompts already exist: `prompts/asset-spec.fable.md`, `prompts/editorial.fable.md`, rendered by
`scripts/content-prompts.mjs` (`renderLanePrompt(laneId, brief, extra)`).

## Read first
- HuggingFace MCP (FLUX image gen): https://huggingface.co/docs/hub/agents-mcp and `https://huggingface.co/mcp`.
- Higgsfield MCP (image/video, async poll): `https://mcp.higgsfield.ai/mcp` and https://higgsfield.ai/mcp.
- Reuse: `scripts/mcp-client.mjs` (`listTools`, `callTool`, `connectionState`) — assets need no new transport.
- Reuse: `scripts/content-prompts.mjs`, the `runClaudeCode` lane runner in `scripts/horizon-api.mjs`.

## Build
1. **`scripts/content-pipeline.mjs`** — orchestrator with `runAssetPlan(brief)`, `generateAssets(brief, plan)`, `assemble(brief)`:
   - `asset_plan`: render `asset-spec` via Claude Code → store the plan; insert `content_assets` rows (status `planned`).
   - `generate`: for each planned asset, `callTool('huggingface', <flux tool>, {...})` for stills and `callTool('higgsfield', <gen tool>, {...})` for video; poll Higgsfield to completion; write `result_url`/`local_path`/`manifest_json`, status `ready`. Discover the exact tool names at runtime via `listTools` (do not hardcode if they differ).
   - `assemble`: render `editorial` via Claude Code with `RESEARCH_JSON` + the asset plan → write one `content_packages` row.
2. **Forward endpoints** in `scripts/horizon-api.mjs` (additive, next to the existing content routes):
   - `POST /api/content/briefs/:id/assets` — manual single-asset trigger (body: kind, provider, prompt, aspect_ratio) → generate one asset now, return it.
   - `POST /api/content/briefs/:id/package` — run the assemble lane, return the package.
   - `POST /api/content/briefs/:id/publish` — set brief status `published`, stamp a `pipeline_runs` row; manual only, no external posting.
   - Extend `runContentLane` to accept `asset_plan` and `assemble` (it already dispatches to Claude Code).
3. Keep every existing endpoint's request/response shape stable. Each lane writes a `pipeline_runs` audit row.

## Constraints
- Manual publish only; no scheduler; no auto-posting. Human review before publish.
- Keys server-side only (`scripts/env.mjs`); never to the browser. MCP auth stays in `.horizon/mcp/`.
- If a connector is not connected, return a clear `{ ok:false, error:"connector_not_connected", connector }` so the UI can prompt the operator to connect it on `/connectors`.

## Acceptance criteria
- From `/content`: a researched brief can run `asset_plan`, generate at least one HuggingFace still, assemble a package, and be marked published — each persisted and visible on reload.
- `curl` each new endpoint returns the documented shape; `pipeline_runs` has one row per lane.
- No regression to `/api/content/briefs/:id/run` (research) or the connectors endpoints.
- Note what shipped, paths, and the next action.
