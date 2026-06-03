# Horizon OS Master Build Plan

This is the execution contract for building Horizon OS vertically, one working slice at a
time, from the now-complete source inputs. It supersedes ad-hoc feature work: every version
must leave behind a working screen, seeded local data, a canonical doc, and a verified command.

## Source Inputs (now in-repo)

The two plans the operating doc referenced are now canonical and live in the repo:

- `docs/source-inputs/income_plan.md` - the 4-phase service-to-product income pathway (floor -> engine -> wedge -> move). Hard numbers: $80-150k cash + $3k/mo MRR target; $80-150/hr floor; 25 outbound/wk; 3 conversations/wk.
- `docs/source-inputs/twelve_month_plan.md` - the four anchors (Body, Attention, Capital, Spec) and the three-phase arc (Forge / Test / Transition) with Baki, Krishna, Hanuman as touchstones.

Supporting corpora:

- `docs/plantsage/*` - PlantSage strategic-asset design, stack ADR, UX prompts, and the Charaka codex.
- `skills/social-media/extracted/*` - 14 social-content skills (v1.3.0) to be surfaced in the Resource & Content Inbox (v0.6).
- `public/field/` - Hariharakhona ridge landing, ridge photo, and the West Hill KML placemark (the first Journey trek anchor).

## Operating Doctrine (unchanged, now sourced)

1. Service income first - cash floor before product sprawl (`income_plan` Phase 1).
2. PhotoSelect is the flagship product and main proof loop.
3. Body + Attention + Capital + Spec are the backbone, not optional habits (`twelve_month_plan`).
4. Current active work is PhotoSelect plus varbees open-core fast cash.
5. HSKG is the clean public delivery win and stays parked at `hskg.vercel.app`.
6. Old projects are inputs unless they pass the 5-question buyer gate.
7. Horizon OS supports the current lanes; it does not become a third active product by default.

## Expert Roles

A single operator runs these roles, switching deliberately per slice:

| Role | Owns | Skill leverage |
| --- | --- | --- |
| Architect | Schema, version sequencing, vertical-slice discipline | - |
| Data/Backend | `node:sqlite` tables, seed migrations, `horizon-api.mjs` endpoints | - |
| Frontend | Routes + components on existing Horizon tokens (Panel, SectionHeader, lucide, framer) | frontend-design tokens already in repo |
| Field steward | Obsidian-grade trek ledger: GPS, elevation, branching alleys/valleys | KML + field assets |
| Content steward | Social skills catalog, build-in-public artifact queue | `skills/social-media` pack |
| Ops/Verifier | `npm run db:init` + `npm run build` green per version; commit per slice | - |

## Vertical-Slice Definition of Done

Every version ships all five or it is not done:

1. A working screen reachable from the Shell nav.
2. Seeded local data (`src/data/horizon.js` + `db/schema.sql` + `horizon-db.mjs`).
3. A canonical doc under `docs/`.
4. `npm run db:init` succeeds and reports non-zero counts.
5. `npm run build` passes.

## Build Order

| Version | Slice | Status |
| --- | --- | --- |
| v0.4 | Journey Ledger (route, capital targets, playbook) | Done |
| v0.4.1 | Obsidian-grade Journey trek ledger (GPS + elevation + branching alleys/valleys, DB-backed, reusable scout template) | Done |
| v0.5 | Capital & Runway OS (`/capital`: targets, cash ledger, offer pipeline, weekly math vs Feb-2027 gap) | Done |
| v0.6 | Resource & Content Inbox (`/inbox`: resource capture, social backlog, 14-skill catalog) | Done |
| v0.7 | Calendar Write Loop (local event create/edit, Google payload dry-run) | Next |
| v1.0 | Weekly Command OS (Sunday review workspace) | Planned |

## Inspection Gates (where the operator must supply real data)

- **v0.5 Capital**: real current cash, monthly burn, and any MRR. The build seeds editable
  placeholders (savedInr = 0, burn = estimate) so the screen works immediately; the math only
  becomes true once real balances are entered. This is the one place numbers must come from the user.
- Everything else proceeds on sensible defaults derived from the source inputs.
