# PhotoSelect Go-Live — the real gaps

Honest status after reading the repo (`~/Desktop/bolting/01-revenue/photoselect`). PhotoSelect is
**not** an early-stage product that needs a landing page built. It is live at `app.photoselect.space`
with a complete v2 marketing funnel. Building a new landing would duplicate shipped work and violate
the repo's roadmap-first contract. The bottleneck is credentials + distribution, exactly as the
Wealth Engine predicted ("you can ship faster than you can get anyone to care").

## What's already done (do not rebuild)

- Live app + control room + marketing site on Cloudflare Workers (OpenNext), Go/Gin API on Cloud Run,
  Postgres, Redis/Asynq, InsightFace sidecar, R2 media.
- **Landing v2** (`frontend/src/app/page.tsx`): Hero -> MondayPanic (problem) -> Ledger (solution) ->
  ThreePowers -> Pricing -> Faq -> **FounderEarlyAccess (waitlist capture)** -> Footer. Title:
  "Shot Sunday. Delivered Monday."
- Razorpay create-order/verify/webhook coded and tested; payment idempotency + ledger guards in place.
- A full GTM doc set: `gtm_plan_msme.md`, `launch_pilot_14day.md`, `founder_demo_playbook.md`,
  `market_research.md`, `competitive.md`.

## The actual blockers (in priority order)

### 1. Credentials (operator action — only you can unblock)

From `agent_docs/roadmap.md`, the remaining gates are credential-blocked, not code:

- Live **Razorpay** keys (the live-payment proof path).
- **WhatsApp** provider creds + approved templates (or the manual fallback).
- Approve **prod DB migration 61** before backend rollout.
- Authenticated browser E2E + production R2 upload proof + deploy smoke.

Action: drop these into the photoselect repo's env per its runbooks, then its own agent can run the
verification ladder. Horizon's job is to track this gate, not to re-implement it.

### 2. The real landing hero asset

`/landing/hero-wedding.webp` is referenced but flagged as a remaining gate ("the real landing hero
asset"). A single strong wedding-delivery hero image. This is a content asset, not a build.

### 3. Distribution (the true bottleneck — faceless, no calls)

The product can sell; nobody is watching yet. Execute the existing `launch_pilot_14day.md` with the
no-call funnel: useful presence in Indian photographer FB/WhatsApp/IG groups -> the live landing ->
FounderEarlyAccess waitlist -> async WhatsApp/email onboarding -> white-glove the first 10 studios.
This is doing, not building. Horizon's role: generate the build-in-public posts and community replies
(varbees + @antharmaya), queue them, and track replies/signups as the weekly scoreboard.

## What Horizon should do here

- Mark the credential items as an Action Queue gate gated on the operator.
- Generate the distribution content (posts/replies) and the 14-day pilot checklist into the queue and
  the Obsidian vault.
- Do **not** open code work in the photoselect repo from the Horizon session; deploy a prompt into the
  repo and let its own roadmap-first agent execute under its guardrails.

## Where new building effort actually creates value

PhotoSelect is build-complete for launch. The greenfield, faceless, no-call fast-cash lane that is
NOT yet built is the **rateguard open-core SKU** (`02-fast-cash/rateguard`): three tested SDKs already
exist; the missing pieces are the open-source positioning, the free-core vs paid-tier split, the
README that sells, and the checkout. That is where coding hours produce new money, not duplication.
