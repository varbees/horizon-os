# Revenue Engine Reset

Horizon OS is not a dashboard. It is the local operating system for turning work into money.

The infrastructure is now useful only if it forces three things every week:

1. A paid signal from PhotoSelect.
2. A fast-cash developer product artifact under varbees.
3. A distribution loop that creates conversations without calls, paid ads, or showing face.

## The corrected operating model

| Layer | Role | Rule |
| --- | --- | --- |
| PhotoSelect | Primary revenue engine | Indian wedding/event studios. One conversion page, one paid-waitlist/pre-sale CTA, async onboarding. |
| varbees | Fast-cash open-core lane | Open-source a useful core, sell the production-ready shortcut. |
| Horizon OS | Control surface | Queue, deploy, track, sync to Obsidian, and convert signals into tasks. |
| Obsidian | Durable memory | Long notes, decisions, playbooks, proof logs, weekly reviews. |
| PlantSage | Strategic proof | Keep bounded unless a buyer or paid path appears. |
| HSKG / DialysisSaathi / old repos | Archive or proof | Mine patterns only; no active work unless buyer validation appears. |

## What counts as progress

Progress is not a new card, route, or integration.

Progress is one of:

- money collected;
- paid-waitlist/signup captured;
- async buyer conversation started;
- proof page shipped;
- open-source repo improved in a way that can earn stars or trust;
- checkout/pricing/offer clarified;
- signal converted into a deployable action;
- Obsidian memory updated with a decision and next move.

## The no-call revenue funnel

PhotoSelect:

```text
useful public post / community reply
-> landing page with one promise
-> paid waitlist or async pilot request
-> WhatsApp/email onboarding
-> white-glove written setup
-> paid studio proof
```

varbees:

```text
useful open-source repo
-> README that sells the saved time
-> build-in-public thread
-> email/list or GitHub stars
-> paid template/pro module/hosted utility
```

## Agent roles inside Horizon

These are small workers, not personalities.

| Agent | Job | Output |
| --- | --- | --- |
| Revenue Router | Reject work that does not map to money, proof, or distribution. | Task accepted/parked with reason. |
| PhotoSelect Conversion Agent | Create landing copy, objections, async onboarding, studio proof assets. | Page section, CTA, FAQ, outreach copy. |
| varbees SKU Agent | Pick the first open-core product and define free vs paid. | SKU spec, README outline, price, 7-day scope. |
| Signal Miner | Turn RSS/Reddit/GitHub/news into action queue tasks. | 3 deployable actions, ranked by money relevance. |
| Vault Scribe | Sync decisions, actions, proof, and weekly review into Obsidian. | Markdown notes with frontmatter. |
| Spend Guard | Watch usage/cost and stop agent sprawl. | Cost warning and cheaper execution path. |

## Gemini / ADK fit

Use Gemini and ADK only for backend/local workers where free-tier inference helps:

- signal summarization;
- converting saved links into action candidates;
- drafting no-call landing page variants;
- ranking open-source repo ideas;
- generating first-pass Obsidian notes.

Keep keys server-side. Do not put Gemini calls in browser code.

Implementation note: `.env` has local keys and the Node-side scripts load it through `scripts/env.mjs`. Browser code must still never receive these keys.

ADK is useful because it supports production-style agents in Python, TypeScript, Go, Java, and Kotlin, has tool support, graph workflows, session handling, and CLI execution. For Horizon, the first practical use is a TypeScript or Python worker that reads SQLite rows, calls Gemini, writes ranked actions back to SQLite, then syncs to Obsidian.

## Jules API fit

Jules is for async repository work, not the front-end dashboard.

Use it only after:

1. the repo is connected as a Jules source through the Jules GitHub app;
2. the task is clear enough to run as a session;
3. Horizon has written the task prompt and expected output;
4. the result is reviewed before merge.

Jules concepts to remember:

- API is alpha and can change.
- Auth uses `X-Goog-Api-Key`.
- Sources are connected repositories.
- Sessions are units of work.
- Activities are the timeline inside a session.
- `AUTO_CREATE_PR` can create PRs, but keep `requirePlanApproval` for risky work.

## First 7 days

| Day | Non-negotiable output |
| --- | --- |
| 1 | PhotoSelect paid-waitlist page spec + form target. |
| 2 | PhotoSelect page shipped locally and tested on mobile. |
| 3 | First 10 async studio messages or useful community replies drafted. |
| 4 | varbees first SKU selected with price, free core, and paid gate. |
| 5 | varbees README and repo skeleton shipped. |
| 6 | One build-in-public post + one Reddit/IndieHackers post. |
| 7 | Weekly review: money signals, replies, shipped proof, next block. |

## The story

Old story: a command center that knows what is happening.

New story: a money engine that tells the operator what to do next, writes the prompt into the right project, syncs the decision to Obsidian, and measures whether the action created buyer signal.

## Project sweep layer

Run this when Horizon needs current ground truth:

```bash
npm run projects:sweep
```

It scans project roots, writes live repo facts into SQLite, and creates a non-destructive symlink index at:

```text
/home/driftr/Desktop/bolting/_horizon_project_index
```

Use `npm run projects:sweep:watch` for the hourly loop. The sweep is not a nostalgia browser; it answers which repo changed, whether the work supports PhotoSelect or varbees, and what action should be deployed next.
