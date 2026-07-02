# News & Signals (v1.0)

The `/signals` screen is the command center's intelligence feed: an RSS/Atom reader fetched locally by
the Horizon API (never through the browser, so there is no CORS problem), cached in SQLite, and
filtered by category, time, and saved state.

## What it does

- Pulls a seeded set of founder-operator, GTM, India-market, photo/creator-market, agentic-engineering,
  and AI-tool-release feeds. Prune or add sources inline.
- Category chips with live counts (Founder Operators, GTM & Sales, India Market, Photo & Creator Market,
  Agentic Engineering, AI Tool Releases, AI Frontier).
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

The default source set is tuned for the Antharmaya foundry path, not generic curiosity:

- Founder Operators: Y Combinator Blog, Hacker News Frontpage, Show HN, Plausible Blog.
- GTM & Sales: SaaStr, HubSpot Sales.
- India Market: YourStory, Indian Startup News, OfficeChai Startups, Trak.in, Medianama.
- Photo & Creator Market: PetaPixel, Fstoppers, Shotkit.
- Agentic Engineering / AI Frontier / Tool Releases: Simon Willison, Import AI, Latent Space, Hugging Face,
  OpenAI News, Cloudflare Blog, Vercel Blog.

Why this shape:

- PhotoSelect needs buyer and creator-market signal, not only AI news. Photography feeds provide content
  angles and market language for studio owners; India feeds keep local startup and SMB context visible.
- Antharmaya Labs and varbees need credibility through public engineering artifacts. YC/HN/Show HN/Plausible
  provide founder-operator examples; Simon Willison, Hugging Face, OpenAI, Cloudflare, and Vercel provide
  implementation and platform-change signal.
- Founder sales remains a learning loop. SaaStr and HubSpot Sales are not used as dogma; they create prompts
  for discovery, qualification, no-call funnels, and first-customer objections.

Tested and intentionally excluded from defaults:

- Reddit feeds: useful communities, but too many returned `429` during local probes. Add manually only when
  you accept refresh errors.
- The Verge: too broad for the current money lane.
- First Round Review, NFX, Anthropic News, Mike Perham, WedMeGood, Growth Unhinged: useful content, but the
  tested RSS endpoints were missing, stale, or not refresh-viable under the local timeout.
- Lenny's Newsletter and Inc42: high-value, but timed out during the refresh-viability probe. Re-test before
  adding as defaults.

## Exit gate

- `npm run db:init` seeds `signal_sources` (`sourceCount`).
- `npm run build` passes.
- With `npm run dev:full` running, Refresh pulls live items into the feed.
