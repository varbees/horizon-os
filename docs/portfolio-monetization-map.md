# Codebase Monetization Audit

Written 2026-06-04 after the `~/Desktop/bolting` reorg and a marker-file scan of
actual codebases, including archive folders.

Scope: `~/Desktop/bolting/*`, excluding dependency/build folders and treating
`_external` as reference code, not owned product inventory.

Scan result: 281 marker-bearing directories collapsed into 54 owned codebase
families. The archive is not one blob: it contains WhatsApp agent platforms,
lab systems, POS systems, social tooling, old client sites, mobile experiments,
and dead scaffolds. The decision below is by real monetization path, not folder
name.

## Research Rules Used

The framework now uses five rules for solo-founder monetization:

1. One buyer, one acute paid pain, one async channel.
2. Price against value created: payments collected, failures prevented, time
   saved, delivered work, or buyer-visible outcomes.
3. Open core works when the individual-contributor utility is free and the paid
   line is hosted, team, policy, analytics, audit, managed, or executive value.
4. Avoid support-heavy lanes until buyer pull is explicit: hardware,
   marketplaces, healthcare operations, POS deployments, and enterprise agent
   platforms.
5. Archived codebases can donate components, schemas, prompts, docs, or UX
   patterns. They do not become active roadmaps without a named buyer.

Research grounding:

- YC essential advice: launch, write code, talk to users, find 10-100 customers
  who love the product, choose one or two metrics, and avoid distracting large
  deals early.
- Stripe Atlas SaaS pricing: charge on a proxy for value creation, revisit
  pricing regularly, and do not underprice B2B products where price signals
  reliability.
- Open Core / buyer-based open core: free features should map to individual
  contributor value; paid features should map to management, team, governance,
  or hosted value.
- Bessemer AI Pricing Playbook 2026: AI products need pricing that reflects
  compute costs and customer value, avoids pricing-model sprawl, and charges
  for outcomes where possible.

Sources:

- https://www.ycombinator.com/blog/ycs-essential-startup-advice
- https://stripe.com/guides/atlas/saas-pricing
- https://handbook.opencoreventures.com/open-core-business-model/
- https://www.bvp.com/assets/uploads/2026/02/The_AI_pricing_playbook_for_founders_Bessemer_Venture_Partners_2026.pdf

## Verdict Scale

`ENGINE`: main revenue system now.

`ACTIVE SKU`: active fast-cash product lane now.

`SKU OPTION`: real future SKU, but only buyer-pulled or after current lanes pay.

`PARTS`: useful code, schema, workflow, docs, or UX to mine into active lanes.

`CLIENT`: one-time/retainer proof, not a recurring product.

`PROOF`: credibility or technical proof only.

`DEAD`: no monetization path inside the current framework.

`REFERENCE`: learning/provenance only.

## Final Ranking

1. PhotoSelect: only `ENGINE`; first paying studio is the highest-leverage move.
2. RateGuard: only `ACTIVE SKU`; open-source core plus hosted policy dashboard.
3. Agent Linux Control, SecureClaw, Agent Skills, Premortem Oracle: credible
   varbees SKU options, but only after RateGuard creates developer audience.
4. PlantSage and Norma: real strategic assets, but buyer-pulled only.
5. WhatsApp, billing, POS, lab, and analytics archives: useful parts for
   PhotoSelect/RateGuard, not independent products.
6. Marketplaces, LifeOS clones, broad enterprise systems, old mobile scaffolds,
   and unclear apps: archive or dead.

The discipline remains unchanged: no third active lane until PhotoSelect or
RateGuard pays.

## 01 Revenue

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `01-revenue/photoselect` | ENGINE | Go backend, face sidecar, frontend, status Worker, postman collection, agent docs, Razorpay/WhatsApp launch runbooks, payment-gated gallery positioning | Studio SaaS: flat monthly/annual plan, paid concierge setup for annual buyers, zero commission on client downloads | Live Razorpay/WhatsApp credentials, prod migration 61, one paying studio |

## 02 Fast Cash

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `02-fast-cash/rateguard` | ACTIVE SKU | Go/Node/Python SDK packages, runtime traffic protection, token budgets, rate limits, circuit breakers, request events | Open-core SDKs; paid hosted dashboard for policy, usage analytics, alerts, audit logs | Publish free core and paid gate spec |
| `02-fast-cash/agent-linux-control` | SKU OPTION | Rust CLI/toolkit for semantic Linux desktop control, observation, screenshots, input, MCP direction, adapters, safety journal | Free local skill/CLI; paid hosted MCP relay, team policy, audit history, templates | Public observe-plan-act-verify demo |
| `02-fast-cash/layers-ai-studio` | PARTS | Go backend, frontend, Node SDK for LLM cost/energy/CO2 observability | Fold cost/carbon analytics into RateGuard; do not sell standalone now | Write RateGuard analytics gate |

## 03 Strategic

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `03-strategic/desktop-photoselect` | PARTS | PhotoSelect fork with backend, frontend, Tauri frontend, API collection | Paid desktop/offline add-on for existing PhotoSelect studios, not a new product | Wait for three studios to ask for desktop |
| `03-strategic/plantsage` + `03-strategic/ff-planter` | SKU OPTION | Flutter app, FastAPI/Gemini/R2 backend, ingest/report schema, field data, Remotion reels | Paid place packs, research reports, or API after buyer signal | One field proof, then buyer asks |
| `03-strategic/norma-app` + `norma-server` + `norma-esp` | SKU OPTION | Flutter app, Go server, ESP32 firmware for smart spice dispenser | Paid prototype kit, B2B kitchen pilot, or licensed app/firmware only if funded | One buyer-truth page and demo video |

## 04 Clients

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `04-clients/vaman-studios` | CLIENT | Next/App Router site; repo history reunited with newer app/bun rewrite over older layout | One-time/retainer site work; proof for varbees service credibility | Choose newer rewrite vs older layout, then case study |
| `04-clients/vaman-launch-sequence` | CLIENT | Vite/React/shadcn/GSAP launch surface | One-time launch-page work only | Keep as case-study material |
| `04-clients/cheapandbesttravels` | CLIENT | Local service site scaffold | One-time local-service site work only | Park unless client asks |

## 05 Salvage

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `05-salvage/billing-copilot/invoai` | PARTS | Next/Supabase/Razorpay/Resend/WhatsApp billing app | Mine subscriptions, invoice reminders, payment UX for PhotoSelect | Interview five freelancers before standalone code |
| `05-salvage/deskold/secureclaw` | SKU OPTION | Rust Wasm runtime, CLI/core/MCP/policy/audit crates, schemas, docs, adversarial tests | Open-core agent safety runtime; paid policy packs, audit dashboard, MCP enforcement | One blocked-risky-tool-call demo |
| `05-salvage/deskold/quantdimension` | PARTS | Multi-service finance stack: alt-data poller, features, ML inference, signal API, tick ingestion, web UI | Mine service orchestration/testing only; finance sales/data trust are wrong now | Archive |
| `05-salvage/deskold/sec-def/security defence(1)` | PROOF | Autonomous cybersecurity platform concept, frontend and Docker surface | Proof only; high trust/liability/sales burden | Archive |
| `05-salvage/vault-wealth` | PARTS | Tauri/Rust/SQLCipher local-first finance app | Mine local-first encryption/desktop patterns only | Archive/reference |
| `05-salvage/deskold/ProjectTomorrowClone` | DEAD | Unity project with generated Library state and no buyer story | None | Archive |
| `05-salvage/deskold/SchemaGuardian` | PARTS | Thin marker signal; schema-validation theme | Fold into RateGuard policy validation if needed | Archive |

## 06 Reference

| Codebase | Verdict | Evidence from actual code | Monetization path | First move |
|---|---:|---|---|---|
| `06-reference/agent-skills` | SKU OPTION | `@antharmaya/agent-skills` package | Free core skills, paid pro pack/templates/examples | Publish one free useful skill |
| `06-reference/whatsapp-agent-hub` | PARTS | WhatsApp agent flow app | Mine for PhotoSelect WhatsApp onboarding/delivery | Map PhotoSelect delivery messages |
| `06-reference/antharmaya-labs` | PROOF | Live brand site, Cloudflare/OpenNext workflow | Indirect credibility/distribution only | Publish first paid proof when it exists |
| `06-reference/premortem-oracle` | SKU OPTION | Compact web utility package | Free risk audit, paid saved reviews/templates/RateGuard export | Attach to RateGuard lead magnet |
| `06-reference/antharmaya-premortem` | PARTS | MCP package | Bundle with Premortem Oracle/RateGuard | Reference |
| `06-reference/a-game-of-self` | PARTS | D3 graph, AgentCanvas services, prompts | Fold useful graph ideas into Horizon OS | Merge on demand |
| `06-reference/anthar-vault/app` | PROOF | Flutter personal document intelligence app | No current lane; possible future niche vault only with buyer | Write product truth or park |
| `06-reference/bio-base/shop` | PROOF | Rust P2P protocol crates and Docker | Research proof only | Reference |
| `06-reference/dasa` | REFERENCE | Go DSA practice workspace | Skill sharpening only | Optional practice |
| `06-reference/dlog` | PARTS | Layers of Computation/Data writing | RateGuard distribution content | One AI cost-control post |
| `06-reference/ecologistix` | PROOF | Agents, Go backend, frontend | Recorded proof only; avoid enterprise supply-chain sales | Archive |
| `06-reference/gravita8` | PARTS | UI, Go backend, Rust core, Docker | Mine graph/search ideas into Horizon if needed | Archive |
| `06-reference/homebase` | DEAD | Marketplace/tax/payout requirements | Marketplace trap; keep compliance notes only | Archive |
| `06-reference/kriate` | PARTS | Next/Hono/PostHog/Prisma portfolio stack | Extract UI/analytics into Antharmaya/Horizon | On demand |
| `06-reference/livekit-voice-agent` | PROOF | LiveKit voice-agent package | Voice proof only until paid workflow appears | Reference |
| `06-reference/scrapper` | PROOF | Blinkit scraper/catalog generation | Paid data report only if buyer names dataset | Ask one target buyer |
| `06-reference/widgetforge` | PARTS | Android app, Go API, Python orchestrator, schema, Dart SDK | Mine schema-backed preview/render ideas | Park |

## 07 Archive

Archive is not useless, but almost none of it should become a live product.

| Codebase family | Verdict | Evidence from actual code | Monetization path | Reopen only if |
|---|---:|---|---|---|
| `07-archive/dialysissaathi` | PARTS | WhatsApp-first renal-care support app and sprint docs | Keep healthcare/OCR/WhatsApp/Gemini runbooks; no active lane | Hackathon follow-up or healthcare buyer appears |
| `07-archive/hskg` | CLIENT | Local-service site package | One-time maintenance/proof only | Client asks for DNS/copy changes |
| `07-archive/bbs-agents` | PARTS | AgentHub, AgentHubPro, WhatsAppAgentHub, 26 microservices, RAG, analytics, billing, booking, auth, notification | Mine WhatsApp/agent config/flow patterns; do not revive enterprise platform | Paying business asks for one narrow WhatsApp automation |
| `07-archive/bbs-labtest-*` + `bbs-palve-backend` | PARTS | Lab Node/React apps, Bruno collections, DB dumps for bookings/payments/labs/timeslots | Mine healthcare booking/payment/admin schemas only | Lab buyer funds narrow workflow |
| `07-archive/bbs-nexus-*` | PROOF | NexusIQ prototype and landing packages | Visual/messaging pieces only | Concrete buyer appears |
| `07-archive/bbs-progress` + `bbs-old-work-replica` | REFERENCE | Management summaries and analyses | Provenance only | Need old architecture notes |
| `07-archive/chik-connexa` | PARTS | Social backend/frontend packages | Mine scheduler/analytics for Horizon distribution queue | Horizon needs exact component |
| `07-archive/chik-data-engineering` | PARTS | DuckDB/PyArrow/BigQuery pipeline | Pipeline reference or paid data-service proof | Buyer commits to recurring data report |
| `07-archive/chik-lifeos` | DEAD | React/Express/Postgres/OpenAI/Redis LifeOS | Horizon already owns this surface | Never as separate app |
| `07-archive/chik-mapwhirl` | PROOF | Dynamic map/path animation app | Client visual component only | Paid client needs map animation |
| `07-archive/chik-test-pro` | DEAD | Full-stack todo app | None | Never |
| `07-archive/chik-wavepi` | PARTS | API analytics dashboard | Fold dashboard ideas into RateGuard | RateGuard needs dashboard patterns |
| `07-archive/adhi-aclt20` + `adhi-tass` | CLIENT | Cricket/community site and frontend scaffold | One-time client proof only | Similar client asks |
| `07-archive/liquilogic` + `sept-iwork/liquilogic-pos` + `sept-wework/Liquilogic` | PARTS | POS collections, client/server packages, execution/testing plans | Mine inventory/checkout/testing patterns; avoid POS support load | Retail operator pays for narrow POS workflow |
| `07-archive/sept-wework/Cork-Tech` | CLIENT | Retail landing page with frontend/backend markers | One-time landing proof only | Paid retail site asks |
| `07-archive/twigs-dklutter` | DEAD | Next/Prisma app with unclear product truth | None | Named buyer and rewritten product truth |
| `07-archive/twigs-hoshi-cafe` | DEAD | README-only signal | None | Real client project appears |
| `07-archive/twigs-skillstride` | DEAD | Flutter mobile app scaffold | Flutter lessons only | Named paid mobile workflow |
| `07-archive/twigs-ideas` | REFERENCE | PRD, architecture, API, DB, UI docs | Provenance only | Current product needs one doc |
| `07-archive/twigs-vedhiamruth` | CLIENT | Legacy ASP.NET/VB ecommerce site with checkout/cart/policies/certificates | Paid migration/maintenance only | Original client asks |

## External Code

`~/Desktop/bolting/_external` contains reference/vendor-style material such as
Claude Code source mirror, OpenClaw, and ThreeDotsLabs examples. Treat it as
architecture reference only. Do not sell, rebrand, or count it as owned
monetizable inventory.

## The Operating Answer

PhotoSelect is the engine. RateGuard is the active varbees SKU. Agent Linux
Control, SecureClaw, Agent Skills, and Premortem Oracle are good future
developer SKUs, but they wait for RateGuard audience or buyer signal. PlantSage
and Norma are real, but not first-income lanes. The archive has useful
WhatsApp, billing, POS, lab, analytics, and UI parts. It does not justify a
third active product.

