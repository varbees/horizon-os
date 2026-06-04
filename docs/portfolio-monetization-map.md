# Portfolio Monetization Map

Honest money verdict for every project in `~/Desktop/bolting/<NN-category>/`, plus how each
monetizes **inside the Horizon framework** (faceless, no calls, no jobs, two identities:
`varbees` builder + Antharmaya Labs product house). Written 2026-06-04 after the v2 reorg.

## The thesis (and what current research backs)

The 2026 bootstrapped-solo reality maps almost exactly onto your North Star:

- **Constraint beats scale theater.** Winning solo founders solve *one* narrow workflow, keep
  support low, and reach users through *one* narrow channel. → Two lanes only: PhotoSelect + rateguard.
- **Niche with willingness to pay ($50+/mo) > broad cheap.** Indian studios paying for getting paid
  faster clears this; a generic tool does not.
- **Distribution is half the product.** Build-in-public on `varbees` is your acquisition channel —
  it is not optional polish, it is the funnel.
- **Retention > acquisition early.** First 5 studios kept happy > 50 trials churning.
- **Open-core: gate capability, not the core.** The free core earns trust and contributors; the paid
  tier sells advanced/hosted/managed features. A dev who trusted your free tool for months doesn't
  need a sales call — which is the whole point, since you take none.
- **Median time to $10K MRR is 12–18 months from first paying customer.** So the clock starts at the
  *first rupee*, not today. Getting PhotoSelect's first paying studio is the single highest-leverage act.

## Verdict scale

`ENGINE` live revenue · `SKU` open-core product candidate · `CLIENT` one-time/retainer cash ·
`PARTS` mine into the engine · `PROOF` credibility only · `DEAD` no money path.

## 01-revenue

| Project | Potential | Path inside framework | First move |
|---|---|---|---|
| **photoselect** | **ENGINE — highest** | B2B SaaS: flat studio price + **zero commission** on client download payments; originals locked till paid | Unblock creds (live Razorpay/WhatsApp, prod migration 61) → first paying studio → first 5 |

## 02-fast-cash (the varbees lane)

| Project | Potential | Path | First move |
|---|---|---|---|
| **rateguard** | **SKU — high** | Open-core: free SDK core (rate limiting + LLM token budgets + circuit breakers, Go/Node/Py); paid = hosted policy dashboard + usage analytics | Open-source the core repo; define free-vs-paid line; one launch post on `varbees` |
| **agent-linux-control** | **SKU — medium** | Already a published skill. Sell as a Pro skill / paid hosted MCP for agent desktop control; free core skill drives installs | Ship free skill publicly, gate the hosted/advanced control behind a cheap tier |
| **layers-ai-studio** | PROOF→SKU — low/med | Only if it collapses to one painful dev workflow; otherwise mine UI patterns | Decide: kill or narrow to one feature. Do not let it become lane #3 |

## 03-strategic (bounded; revenue only on buyer signal)

| Project | Potential | Path | First move |
|---|---|---|---|
| **plantsage** + **ff-planter** | SKU (deferred) | Domain research-as-a-service behind rateguard; open-core + hosted tier | Bounded Stage-2 only; build the SKU **after** a buyer appears |
| **norma-app/server/esp** | SKU — medium (recent, real) | 3-repo product (Flutter + Go + ESP firmware) = a hardware/IoT play. Real Jan-2026 effort. Needs a one-line "who pays and why" | Write the Norma one-pager: buyer + the single workflow it sells. Park if none |
| **desktop-photoselect** | PARTS | Tauri offline shell **for the engine**; not its own product | Defer until web PhotoSelect clears ~₹5k/mo MRR |

## 04-clients (real cash, not recurring)

| Project | Potential | Path | First move |
|---|---|---|---|
| **vaman-studios**, **vaman-launch-sequence**, **cheapandbesttravels** | CLIENT | One-time/retainer cash; reuse as portfolio proof for `varbees` distribution | Invoice/close out; turn the best one into a public build-in-public case study |

## 05-salvage (parts for the engine)

| Project | Potential | Path | First move |
|---|---|---|---|
| **deskold** | PARTS — high | Finix split-payment + PCI patterns → lift into PhotoSelect when fee-split is needed | Keep as the reference when PhotoSelect needs studio↔client payment splitting |
| **vault-wealth** | PARTS | Crypto/ledger patterns | Mine on demand only |
| **billing-copilot** | PARTS — high | Billing/subscription patterns → PhotoSelect plan management | Mine when building the paid-plan/billing UI |

## 06-reference (patterns + a few real SKU candidates)

Most are pattern libraries (kriate, dlog, dasa, gravita8, homebase, ecologistix, bio-base,
anthar-vault, a-game-of-self) — `PROOF` only, mine on demand. **antharmaya-labs** is the brand
site (distribution asset, not revenue). The genuine sleepers worth a look:

| Project | Potential | Path |
|---|---|---|
| **whatsapp-agent-hub** | PARTS — high | WhatsApp + agent flow → directly reusable for PhotoSelect's WhatsApp delivery/onboarding |
| **agent-skills** | SKU — medium | Sellable `varbees` agent-skill pack; free core skills + paid pro pack |
| **premortem-oracle** | SKU — low/med | Recent CF-worker tool; could be a tiny paid utility behind rateguard auth |
| **scrapper** | PROOF/SKU — low | Blinkit scraper → data product only if a buyer for the data exists; else pattern |
| **widgetforge** | PARTS | Embeddable-widget patterns for landing/site work |
| **livekit-voice-agent** | PROOF | Voice-agent pattern; reference unless a voice workflow earns |

## 07-archive — DEAD / parked

dialysissaathi (**on hold** — hackathon paused; keep WhatsApp+Gemini runbook as PARTS),
hskg (closed public proof), liquilogic, lanes, and the triaged twigs-*/bbs-*/chik-*/adhi-*/sept-*
scratch. No money path. Reopen only on explicit buyer signal.

## The one-paragraph answer

Real monetization potential, ranked: **PhotoSelect (engine, now)** → **rateguard (open-core SKU,
this quarter)** → then *optional* SKUs only on buyer signal: **agent-skills**, **Norma**,
**plantsage-as-research-API**. Everything in 05-salvage and the WhatsApp/billing references is
**fuel for PhotoSelect**, not separate products. Everything in 07-archive is done. The discipline
that makes this work: refuse a third lane until one of the two is paying.
