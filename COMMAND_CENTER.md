# COMMAND_CENTER.md

Single source of truth for every agent (Claude Code, Codex, Gemini/ADK workers, Jules). Load this at
the start of a session before doing anything. Keep it dense and current: each agent updates the
relevant section at the end of its task. Mirror to the Obsidian vault on sync.

## 1. North Star

Turn work into recurring income over a low burn, faceless, with no sales calls, no jobs, and no paid
ads. ONE revenue engine: **PhotoSelect** (B2B SaaS for Indian wedding/event studios, already live at
`app.photoselect.space`). ONE fast-cash lane: **open-core developer products under `varbees`**
(open-source a useful core, sell a pro tier). Current milestone: **first paying studio → first 5**.
Everything not watering those two is parked.

## 2. Identities

| | varbees | Antharmaya Labs |
| --- | --- | --- |
| Role | The builder / craftsman | The product house |
| Channels | github.com/varbees, dev-side X | @antharmaya on X, r/antharmayalabs, antharmaya.com |
| Content | Open source, code, how-it's-built, technical wins | Product updates, studio wins, the brand |
| Job | Earn dev credibility + distribution | Convert attention into recurring revenue |
| Money | Fast cash: rateguard SKU, dev tools | The engine: PhotoSelect |

Order is fixed: grow varbees (personal, in public) first; it funnels attention to Antharmaya. Faceless
means the work is the face, not a photo.

## 3. Product Portfolio

| Product | Status | Value prop | ICP | Stage | Next action |
| --- | --- | --- | --- | --- | --- |
| PhotoSelect | ACTIVE (engine) | Payment-gated gallery delivery + selfie search; studios get paid faster | Indian wedding/event studios | Live; billing wired | No-call conversion page + paid waitlist; white-glove first 10 |
| rateguard (varbees) | ACTIVE (fast-cash) | Drop-in rate limiting + LLM token budgets + circuit breakers (Go/Node/Python) | Backend/AI devs shipping LLM apps | 3 tested SDKs exist | Open-source core; define free vs paid (hosted policy dashboard) |
| PlantSage (app + ff_planter) | PARKED (strategic) | GPS plant ID + 8-domain research | Field/agri, hobbyists | WIP, no payment | Bounded Stage-2; revenue only if a buyer appears |
| ff_planter as Research-API | PARKED (SKU option) | Domain research-as-a-service (plants→mushrooms→crops) | Agri NGOs, devs | Prototype | Behind rateguard; open-source + hosted tier later |
| dialysissaathi | PARKED (proof) | WhatsApp + Gemini domain assistant | Renal-care families | Hackathon WIP | Finish hackathon; reuse WhatsApp-LLM pattern |
| desktop-photoselect | PARKED | Tauri offline studio shell | Studios | WIP | Defer until web hits ~₹5k/mo MRR |
| deskold | HARVEST | Finix split-payment + PCI patterns | n/a | reference | Lift split-payment into PhotoSelect when fee-split is needed |
| antharmaya-labs, hskg, kriate, vault-wealth, A Game of Self, dlog, gravita8, homebase, ecologistix, widgetforge, billing-copilot, bio-base, anthar-vault, dasa, cheapandbesttravels, vaman-studios | ARCHIVE / REFERENCE | Patterns only | n/a | n/a | Mine on demand; no active work |

Full evidence: `docs/portfolio-revenue-map.md`. Projects now live under category folders in
`~/Desktop/bolting/{active-money,fast-cash,strategic,harvest,support,reference,archive,client-sites}`
(map: `~/Desktop/bolting/STRUCTURE.md`; reversible move log: `_horizon_reorg_manifest.tsv`). Vendor
clones are quarantined in `~/Desktop/bolting/_external` and excluded from the agent view. Regenerable
artifacts were pruned (~16 GB); rebuild deps on reopen.

## 4. Stack

- **PhotoSelect**: Go (Gin) backend on Cloud Run (asia-south1), Postgres, Redis + Asynq workers,
  InsightFace FastAPI sidecar, Razorpay payments, Cloudflare R2 media, Next.js 16 PWA frontend.
- **rateguard**: Go / Node / Python SDKs (`packages/sdk-*`), OTel attributes.
- **Horizon OS** (this repo): React + Vite, local SQLite via Node API on `127.0.0.1:8787`, Obsidian
  vault bridge, MCP connectors, ccusage. Control surface only.
- **Dev env**: Fedora/Nobara, Claude Code + Codex, Gemini key in `.env` (server-side only), Jules for
  async repo work.

## 5. Positioning / Offer (PhotoSelect) — grounded in the repo's own product/GTM docs

- **The single most painful step it kills (answered)**: the post-shoot **client delivery + payment
  collection** mess — sharing thousands of photos over WhatsApp/Drive, chasing clients for selections,
  not knowing who opened/picked, and chasing payment for weeks. PhotoSelect collapses that into one
  ledger per album: upload -> WhatsApp link -> client selects -> payment gate -> instant unlock ->
  delivery proof.
- **Live hero promise (already shipped on the v2 landing)**: **"Shot Sunday. Delivered Monday."**
- **Founder-led sales line**: deliver client galleries and get paid without WhatsApp chaos, Drive
  links, or a PhotoSelect commission on client download payments. (Say "zero PhotoSelect commission".)
- **Buyer**: high-volume Indian wedding/event studio owner, on a phone, software-starved.
- **Wedge**: flat studio pricing + **zero commission** on client download payments; originals stay
  locked until payment clears.
- **Alternative it beats**: manual WeTransfer/Drive delivery + chasing payments, or clunky foreign tools.
- **Status**: landing v2 is **live with early-access capture** (`FounderEarlyAccess`). The real gaps
  are NOT a landing page; they are credentials (live Razorpay/WhatsApp/prod DB migration 61) and
  distribution. See `docs/photoselect-go-live.md`.
- **Price**: free trial + one paid plan; pre-sale "first 10 studios, 50% off for life".
- **Acquisition (no calls)**: useful presence in photographer FB/WhatsApp/IG groups → landing page →
  paid waitlist → async WhatsApp/email onboarding → white-glove setup → paid proof.

## 6. Constraints

No sales calls. No jobs. Faceless (work is the face). Solo + agent-orchestrated. Low burn
(Srikalahasti). Keys server-side only, never in browser code. Local-first: writes go through the
Horizon API to SQLite; Obsidian holds durable memory.

## 7. Current Focus (90-day)

- Weeks 1–2: PhotoSelect landing + paid waitlist live; profiles aimed; daily 1 build-in-public post +
  ~20 niche replies; scaffold the rateguard open-core repo.
- Weeks 3–6: ship PhotoSelect's single most painful workflow step to usable; white-glove first studios;
  ship rateguard free core + paid tier; first varbees dollar.
- Weeks 7–12: first 5 studios → word of mouth; iterate only on what paying users demand.

This week's input targets (you control inputs, not outcomes): features shipped, studios onboarded,
posts, replies, dollars. See `docs/revenue-engine-reset.md` "First 7 days".

## 8. Definition of Done (guardrails)

- Vertical slices only: UI → logic → data → wired → deployed, or it isn't built. No half-features.
- Works in the real environment, happy path tested, error/empty states handled, dead ends wired.
- Do exactly the slice asked; list follow-ups, don't silently expand.
- No secrets in code; use `.env` via `scripts/env.mjs`; never ship keys to the browser.
- Progress = money collected, paid signup, async buyer conversation, proof shipped, OSS improved,
  offer clarified, signal→action, or an Obsidian decision logged. A new card is not progress.
- End every task with: what shipped, the path/URL, what's left, and the single highest-leverage next
  action. Update the relevant section here.

## TODOs needing the operator's answers

- ~~PhotoSelect: confirm the single most painful workflow step.~~ ANSWERED (section 5): post-shoot
  client delivery + payment collection. Landing already ships this as "Shot Sunday. Delivered Monday."
- PhotoSelect go-live: provide live Razorpay keys + WhatsApp provider creds, and approve prod DB
  migration 61, so the live-payment proof path can be exercised (see `docs/photoselect-go-live.md`).
- rateguard: confirm the free-core vs paid-gate split and the launch price.
- Confirm the varbees GitHub org/handle and the Antharmaya X/Reddit handles are claimed.
