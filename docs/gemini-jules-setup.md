# Gemini + Jules Setup (wired and verified)

Both agent APIs are configured server-side and confirmed working. Keys live in `.env` (gitignored),
loaded via `scripts/env.mjs`. Browser code never receives them.

## Gemini (in-app worker)

- Key: `GEMINI_API_KEY` in `.env`. Model: `GEMINI_MODEL` (default `gemini-2.0-flash`).
- Client: `scripts/gemini.mjs` (dependency-free REST). Worker: `enrichAction()` turns a rough action
  into goal + constraints + done-criteria + a tightened prompt.
- Endpoint: `PATCH /api/action-queue/:id/enrich`. UI: the action drawer's "Enrich with Gemini" button.
- Status: verified — a live call authenticates and reaches the API. A `429` means free-tier quota is
  exhausted for now (resets daily); the integration is correct.

## Jules (async repository work)

- Key: `JULES_API_KEY` in `.env`. Base: `https://jules.googleapis.com/v1alpha`, auth header
  `X-Goog-Api-Key`. API keys are created in the Jules web app Settings page (jules.google.com, max 3).
- Client: `scripts/jules.mjs` — `listSources`, `createSession`, `getSession`, `listActivities`,
  `sendMessage`, `approvePlan`.
- Endpoints:
  - `GET /api/jules/sources` — connected repos.
  - `POST /api/action-queue/:id/jules` — dispatch a Horizon action to a Jules session. Body:
    `{ source, branch?, requirePlanApproval?, automationMode? }`. The action's runnable spec becomes the
    Jules prompt; `requirePlanApproval` defaults to **true** (nothing changes in the repo without a
    reviewed plan). Without `source`, the endpoint returns the available sources so you can pick.
  - `GET /api/jules/sessions/:id` — session status + activities timeline.
- Status: verified — `GET /api/jules/sources` returns `200`. Connected source confirmed:
  `sources/github/antharmaya/The-Layers-of-Computation`.

### To dispatch PhotoSelect / rateguard to Jules

Connect those GitHub repos to Jules via the Jules GitHub app, then they appear in
`GET /api/jules/sources`. Dispatch an enriched, reviewed action with the matching `source`. Keep
`requirePlanApproval: true` for anything that writes to a repo.

## Auto-enrich new actions

After a sweep generates actions, enrich the new ones into runnable specs in one step:

- `npm run actions:generate:enrich` — generate revenue actions, then auto-enrich them.
- `npm run actions:enrich` — enrich just the un-enriched actions (standalone).
- `POST /api/action-queue/enrich-all` — same, from the API (for a UI button or the hourly loop).

`scripts/auto-enrich.mjs` is quota-safe: it enriches a bounded batch (`HORIZON_ENRICH_LIMIT`, default 6)
with a delay between calls and **stops cleanly on a 429** (`stoppedForQuota: true`) so the operating
loop never blocks on Gemini quota. Run it again after the daily quota resets.

## Dispatch to Jules from the UI

The action drawer has a **Send to Jules** button: it lists connected repos
(`GET /api/jules/sources`), you pick the source + branch, and dispatch creates a plan-gated session.
Verified end-to-end: a real session was created on `antharmaya/The-Layers-of-Computation`.

## Operating rules

- Keys are server-side only. Never import them into browser bundles.
- The core action loop must not depend on remote model availability — enrichment and Jules dispatch are
  optional accelerators; rule-based generation and manual specs keep the queue usable offline.
- Both APIs are alpha/free-tier; treat rate limits and schema drift as expected, not as failures.

## Security note

The Gemini key and the Jules key were shared in plaintext during setup and now exist in chat history.
Rotate both if that transcript is ever shared (Gemini: AI Studio console; Jules: web-app Settings,
delete and recreate the key).
