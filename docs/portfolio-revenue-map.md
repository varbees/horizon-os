# Portfolio Revenue Map

Updated 2026-06-04. This is the short operating summary. The detailed
codebase-family audit, including archived projects, lives in
[`docs/portfolio-monetization-map.md`](./portfolio-monetization-map.md).

## Current Money Order

1. **PhotoSelect** is the only revenue engine.
   - Path: `~/Desktop/bolting/01-revenue/photoselect`
   - Why: actual product code exists for payment-gated gallery delivery, client
     selection, people discovery, Razorpay/WhatsApp launch flow, backend,
     frontend, face sidecar, and status worker.
   - Money action: live Razorpay/WhatsApp credentials, prod migration 61, first
     paying studio, first 5 retained studios.

2. **RateGuard** is the active varbees fast-cash SKU.
   - Path: `~/Desktop/bolting/02-fast-cash/rateguard`
   - Why: actual Go, Node, and Python SDKs exist for rate limits, token budgets,
     circuit breakers, and runtime events.
   - Money action: open-source the free core, then gate hosted policy,
     analytics, alerts, audit logs, and team controls.

3. **Everything else is proof, parts, client cash, or buyer-pulled.**
   - Agent Linux Control, SecureClaw, Agent Skills, and Premortem Oracle are
     real future developer SKUs, but not active lanes until RateGuard creates
     audience or buyer pull.
   - PlantSage and Norma are real strategic assets, but buyer-pulled only.
   - Billing Copilot, WhatsApp Agent Hub, LiquiLogic, BBS LabTest, WavePI, and
     other archive codebases are parts to mine into the two money lanes.
   - DialysisSaathi is on hold/reference; keep the WhatsApp/Gemini runbook, do
     not resume hackathon work unless a concrete follow-up appears.

## Operating Rule

No third active lane until either PhotoSelect or RateGuard pays.

The project sweep and action queue should treat the detailed monetization audit
as the scoring prior. Any generated action must advance:

- PhotoSelect revenue proof,
- RateGuard/varbees fast-cash,
- distribution for those two,
- or explicitly named extraction work from an archive into one of those two.

