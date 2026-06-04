# Portfolio → Revenue Map

A repo-grounded verdict on every real project, scored by one question: does it move money this
quarter? This is the layer the research agents could not produce because they never saw the code.

Strategy frame (from `docs/revenue-engine-reset.md` and the Wealth Engine doc): ONE engine
(PhotoSelect), ONE fast-cash lane (open-core dev products under `varbees`), everything else parked,
strategic, or harvested for parts. Distribution, not building, is the bottleneck.

## Verdicts

| Project | What it is | Evidence | Verdict | Next money action |
| --- | --- | --- | --- | --- |
| **photoselect** | B2B SaaS: payment-gated gallery delivery + selfie search for Indian studios. **Live at app.photoselect.space** | `backend/internal/payment/razorpay.go` (create-order/verify/webhook complete), pricing + billing tests, face-sidecar (InsightFace), Go/Gin + Next.js 16 PWA on Cloud Run + R2, prod migrations at `000061` | **ENGINE** — the only product with a live paying path | Ship the no-call conversion landing page + paid waitlist; white-glove first 10 studios |
| **rateguard-exp** | Production SDK middleware (rate limit, token budgets for LLM paths, circuit breaker, OTel) in Go/Node/Python | `packages/sdk-{go,node,python}` with limiter/tokens/presets + full `*_test` suites, built `dist/` | **TOP FAST-CASH SKU** | Open-source the core under varbees; sell a pro tier (hosted policy dashboard + conformance suite) |
| **agent-linux-control** | Rust toolkit: native semantic Linux desktop control for coding agents (one CLI) | `Cargo.toml`, `crates/`, `adapters/`, `plugins/`, `install.sh`, `skills/` | **SKU #2** (AI-dev tooling, trendy) | Park behind rateguard; ship as second SKU once the first sells |
| **plantsage_app + ff_planter** | Flutter app + FastAPI: GPS plant ID, 8-domain SpeciesCard, R2/MinIO media | active (touched recently), Gemini Vision pipeline | **STRATEGIC-PROOF** | Bounded Stage-2 only; no revenue work until a buyer/paid path appears |
| **antharmaya-labs** | The `antharmaya.com` product-house site (Next.js on CF Workers) | `README` OpenNext/CF | **ENGINE-SUPPORT** | Host the PhotoSelect proof + build-in-public; not a product itself |
| **layers-green-ai-studio** | LLM cost/energy/carbon observability + SDK | docs/sdk-node | **SECONDARY-SKU / merge** | Fold the useful SDK bits into rateguard's "AI cost" angle; do not ship standalone |
| **widgetforge** | Android widget builder (2.4G) | large WIP | **PARK** | Only if the varbees audience asks for Android widgets |
| **billing-copilot / invoai** | Invoice/billing assistant | WIP | **HARVEST** | Mine GST-invoice logic as a possible micro-tool; otherwise archive |
| **dialysissaathi** | WhatsApp renal-care support | hackathon `main` | **ARCHIVE / proof** | Finish the hackathon path, then park; reuse the WhatsApp Cloud API pattern |
| **hskg** | One-page Next.js proof at hskg.vercel.app | parked | **ARCHIVE** | Keep as a delivery proof link; mine the LocalBusiness-schema pattern as a free tool |
| **desktop-photoselect** | Tauri desktop variant (2.2G) | `feature/desktop-os-tauri` | **PARK** | Defer; the web engine ships first |
| **gravita8 / homebase / ecologistix** | Architecture-demo platforms | `architecture_status.md` | **ARCHIVE-FOR-PARTS** | Portfolio/reference only; harvest Taskfile/infra patterns |
| **kriate** | Next.js 3D portfolio | complete | **REFERENCE** | Cannibalize components for landing pages |
| **vault-wealth** | Local-first encrypted finance suite | `main` | **ARCHIVE** | Mine local-first crypto patterns if ever needed |
| **anthar-vault / bio-base / A Game of Self / dlog / dasa / deskold / sept / vaman-studios / cheapandbesttravels** | Vault app / SHOP protocol / soul-game / writing / DSA / archive / client sites | mixed | **ARCHIVE / REFERENCE** | No active work; mine patterns on demand |

## The two decisions that matter

1. **Engine = PhotoSelect.** It already has the thing every other repo lacks: tested billing and a
   payment webhook. The work is not more code, it is the conversion page + getting the first 10
   studios live (white-glove, async, no calls).
2. **First fast-cash SKU = rateguard.** It is the only repo that is already a clean, multi-language,
   tested library. Open-core fits perfectly: free SDK earns GitHub stars and an email list, the paid
   tier (hosted policy/conformance dashboard) earns cash. The "token budgets for LLM-heavy paths"
   angle rides the AI-dev-tooling wave. Smallest distance from where you are to a sellable thing.

## What Horizon should do with this

The action-queue revenue generator (`npm run actions:generate`) and the project sweep should treat
this table as the scoring prior: any deployable action must advance PhotoSelect revenue, the rateguard
SKU, or the distribution flywheel. Everything else is parked by default.

## Subagent deep-dive findings (folded in)

Two of three parallel deep-analysis sub-agents got filesystem access and confirmed/sharpened the map:

- **PhotoSelect is live, not just launch-ready** (`app.photoselect.space`, prod migrations `000061`,
  Razorpay fully wired in `backend/internal/payment/razorpay.go`). The first paying studio is a
  distribution problem, not a build problem.
- **deskold is a high-value harvest, not dead weight**: it contains **Finix split-payment logic**, a
  payment-webhook pattern, and a PCI-DSS checklist (`FINIX_MASTER_PLAN.md`). Lift the split-payment
  pattern into PhotoSelect when a studio→platform fee split is needed. (Upgrade deskold to HARVEST.)
- **ff_planter is a "Research-as-a-Service" SKU**: the 8-domain Gemini grounding generalizes beyond
  plants (mushroom ID, crop disease, herbal remedies). Open-source the FastAPI + prompt stack under
  varbees, sell a hosted tier. Secondary to rateguard but real.
- **vault-wealth** (Tauri + Rust + SQLCipher + Argon2id) holds reusable encryption/offline patterns
  for a future "secure delivery" PhotoSelect add-on. Harvest, do not ship standalone.
- **A Game of Self (AgentCanvas)** and **dlog** are documentation gold (real-time graph sync, DB
  decision trees) with little runnable code: reference, not product.

Other work locations scanned: `~/Documents` holds Scrapper (Blinkit scraper) and mostly vendor/learning
clones (MiroFish is not the owner's); `~/Desktop` top level holds field assets + study PDFs, no new
product. Nothing there changes the two decisions above.

The dev-tooling cluster (rateguard, agent-linux-control, layers, widgetforge, billing-copilot) was
analyzed by direct inspection because that sub-agent was sandbox-blocked: rateguard's three tested
SDKs make it the single best first SKU.
