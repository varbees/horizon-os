# Capital and Runway OS (v0.5)

The `/capital` screen turns the February 2027 target into weekly math. It is built directly on
`docs/source-inputs/income_plan.md` (the floor-first service pathway) and the capital targets in
`docs/capital-goals-2027.md`.

## What it tracks

- **Runway**: current cash, monthly burn, MRR, and the resulting net runway in months.
- **Gap**: total of the three capital targets (INR 11.5L) minus what is saved, plus the required
  monthly and weekly savings to close it before the milestone date.
- **Offer pipeline**: the service-income funnel (prospect -> conversation -> proposal -> won/lost),
  seeded from the income_plan productized offers (PhotoSelect pilot, AI Integration Sprint, RevOps
  retainer, and a reusable local-business page pattern from the closed HSKG proof) with open and
  stage-weighted value.
- **Cash ledger**: money in / out with this-week totals and a quick-add form.
- **Income-engine cadence**: 25 outbound, 3 conversations, 1 paid offer, 3 build-in-public posts
  per week — the non-negotiable funnel inputs from the distribution playbook.

## Data model

Four tables in `db/schema.sql`, seeded from `src/data/horizon.js`:

- `capital_targets` (target_inr, saved_inr, deadline, purpose, next_action)
- `cash_ledger` (date, direction, amount_inr, category, note)
- `offer_pipeline` (buyer, offer, stage, value_inr, recurring, next_action)
- `runway_state` (single `current` row: cash, burn, mrr, weekly targets, milestone_date)

The math lives in `src/lib/capitalMath.js` as a pure function so the screen renders identically with
live API rows or static seeds. The API composite is `GET /api/capital`; mutations are
`PATCH /api/capital/runway`, `PATCH /api/capital/targets/:id`, `POST/DELETE /api/capital/ledger`,
and `POST/PATCH/DELETE /api/capital/pipeline`.

## Inspection gate (operator input required)

`runway_state` is seeded with zeros for cash, burn, and MRR. The screen shows an inspection-gate
banner until real numbers are entered. The runway knobs persist to the DB when `npm run dev:full`
is running; `npm run db:init` will not overwrite an already-entered runway row (it uses
`ON CONFLICT DO NOTHING`).

To make the math true, enter:

1. Current cash / opening balance.
2. Average monthly burn.
3. Any existing MRR.

## Exit gate

- `npm run db:init` seeds capital targets and pipeline (reported as `capitalCount`/`pipelineCount`).
- `npm run build` passes.
- The screen answers: what must be earned this week, this month, and by February 2027.
