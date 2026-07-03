# Horizon OS — Production & Open-Source Contract

**Created 2026-07-02. The contract for taking Horizon OS from personal command center to an open-sourceable, production-grade framework under Antharmaya Labs: an agentic OS in the browser that anyone can point at their workspace — goals-aligned, self-correcting, founder-driven. Not another dumb agent; a system that works FOR its operator.**

## The bar

Postman/Notion-class app behavior: installable (PWA), instant-feeling (skeletons + optimistic UI, never a dead spinner), operator-steerable (edit the commands agents run, see them think, redirect them), and workspace-portable (first-run: point at a directory, the OS builds itself around it). Light-first, token-driven design; never terminal/brutalist.

## What "production grade" concretely requires (gap audit, 2026-07-02)

| Area | State today | Required for v1.0 open-source cut |
|---|---|---|
| Workspace loading | Sweep root via env var only | ✅ First-run onboarding: set workspace root in-app (settings-backed), sweep builds the Hub/graph. SHIPPED as of this doc |
| App behavior | Browser tab | ✅ PWA: manifest + service worker + install prompt. SHIPPED |
| Perceived speed | Ad-hoc "loading" text | ✅ Skeleton system (shared primitive, wave shimmer, shape-accurate) + optimistic UI on operator mutations. Primitive + key surfaces SHIPPED; remaining surfaces incremental |
| Nav ergonomics | Groups always expanded | ✅ Collapsible nav groups, persisted. SHIPPED |
| Keys & providers | ✅ Done (masked, allowlisted, .env-backed) | Add per-user profile file for OSS (config dir, not repo .env) |
| Agent steering | Dispatch prompts editable pre-run; no live view | Workspace-alpha v2 (SSE agent console) + v3 (stop/redirect/resume) — see docs/horizon-workspace-alpha.md |
| Self-correction | Doctor (read-only health contract) + trust summary + retrieval eval exist | Wire doctor warns → suggested corrective actions in the queue (loop: detect → propose → operator approves → dispatch) |
| Multi-workspace / identity | Single hardcoded operator narrative in seeds | Seed-pack extraction: personal seeds (Harsha's nodes/blocks/docs) move to a `workspace-pack`; OSS ships a neutral starter pack + onboarding questionnaire that generates the graph |
| Security posture | localhost-only, CORS pinned to 5177, keys server-side | Threat-model doc; auth layer optional flag for LAN/Tailscale exposure; secrets never in repo (already true) |
| Docs & DX | Rich internal docs | Public README rewrite, quickstart (one command), CONTRIBUTING, LICENSE (MIT), demo GIFs |
| Naming/brand | "Horizon OS" personal | OSS name decision under Antharmaya Labs (candidate: keep `horizon-os`; check npm/gh collisions before launch) |
| Tests | Playwright e2e + unit tests exist, partially stale | Green CI gate on the OSS repo before launch |

## Release ladder

- **v0.9 "Operator cut" — NOW, Harsha starts daily use.** Everything shipped through today: command graph + workspace mode, job-plan calendar + routine rail, DeepSeek default provider + key management, Playground, PWA, skeletons, onboarding. Daily use IS the hardening process — every rough edge found while actually operating gets fixed before strangers see it.
- **v0.95 "Agent console"** — workspace-alpha v2+v3 (live transcripts, steer/stop/redirect). The differentiator vs every dashboard-only life-OS.
- **v1.0 "Public cut"** — seed-pack extraction (personal data out of the repo), neutral onboarding, README/docs/license, CI green, name locked. Open-source launch under Antharmaya Labs (fits the OSS-signal thesis: developer trust → inbound → paid lanes).

## Design-system rules for contributors (summary; full tokens in DESIGN.md)
Light-first; tinted neutrals + blue primary; green/amber/rust semantic only. Fraunces display / Manrope body / IBM Plex Mono labels. Springs for movement, duration-easing for opacity/color, `prefers-reduced-motion` respected. Skeletons must mirror real content shapes; no spinner longer than 300ms without shape or status text. Panels float over canvases; the canvas never shrinks into a card.
