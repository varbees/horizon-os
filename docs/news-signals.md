# News & Signals (v0.9)

The `/signals` screen is the command center's intelligence feed: an RSS/Atom reader fetched locally by
the Horizon API (never through the browser, so there is no CORS problem), cached in SQLite, and
filtered by category, time, and saved state.

## What it does

- Pulls a seeded set of AI / agentic-engineering / Reddit / video feeds. Prune or add sources inline.
- Category chips with live counts (AI News Hubs, AI Frontier, Agentic Engineering, AI Tool Releases,
  Videos, AI Business).
- Grid / List / Saved views and 24H / Week / All time filters, plus search.
- Save or dismiss each item; saved items persist.

## Data model

`db/schema.sql`:

- `signal_sources` (name, url, category, kind: rss | reddit | youtube, active)
- `signals` (source, category, title, url, summary, thumbnail, published_at, status: new | saved | dismissed)

Seeded from `src/data/horizon.js` (`signalSourceSeed`, `signalSeed`).

## How fetching works

`scripts/rss.mjs` is a dependency-free, tolerant RSS/Atom parser (handles CDATA, HTML entities,
`media:thumbnail`/`enclosure` images, and `pubDate`/`published`/`updated` dates). The API:

- `GET /api/signals` returns sources + cached signals.
- `POST /api/signals/refresh` fetches every active source server-side (with a browser-like user agent
  and a 9s timeout), upserts items (deduped by a hash of the link), and reports new-item and error
  counts. Per-source failures are isolated so one dead feed does not break the refresh.
- `PATCH /api/signals/:id` sets save/dismiss; `POST/DELETE /api/signal-sources` manage the source list.

Refresh is manual for now (the Refresh button). A scheduled hourly refresh is a later addition.

## Default feeds (prune freely)

Hacker News, TechCrunch AI, The Verge, Import AI, Latent Space, Simon Willison, Hugging Face Blog,
r/LocalLLaMA, r/ClaudeAI, r/MachineLearning, Two Minute Papers, AI Explained. Some feeds (Reddit,
YouTube) require the local network on the operator's machine; the dashboard renders a seed placeholder
until the first refresh.

## Exit gate

- `npm run db:init` seeds `signal_sources` (`sourceCount`).
- `npm run build` passes.
- With `npm run dev:full` running, Refresh pulls live items into the feed.
