# Agent Prompt-Pack (Claude Code Opus + Codex)

Copy-paste prompts so steering Horizon OS is one paste, not a paragraph. Every prompt
assumes the agent is run from the Horizon repo root and that `COMMAND_CENTER.md` is the
single source of truth. Keep these in sync with `docs/operating-loop.md` and
`docs/gemini-jules-setup.md`.

The contract for every agent: **load `COMMAND_CENTER.md` first, ship vertical slices only,
no secrets in browser code, end with what shipped + path/URL + the single highest-leverage
next action, and update the relevant `COMMAND_CENTER.md` section.**

---

## 0. Boot (paste at the start of any session)

```
Read COMMAND_CENTER.md end to end — it is the single source of truth (North Star, identities,
portfolio, stack, constraints, Definition of Done). Then read docs/operating-loop.md.
Do not propose work that waters anything outside PhotoSelect (the engine) or varbees open-core
(fast cash). Constraints are absolute: no sales calls, no jobs, faceless, low burn, keys
server-side only. Work vertical slices (UI -> logic -> data -> wired -> deployed) or it is not
built. End every task with: what shipped, the path/URL, what's left, the single highest-leverage
next action — and update the matching COMMAND_CENTER.md section.
```

---

## 1. Morning loop (run the orchestrator, pick the move)

```
Run `npm run horizon` once and read .horizon/loop-status.json. Report the cycle: projects
swept, dirty repos, actions generated, actions enriched (note if stoppedForQuota), and the
count of enriched actions ready for dispatch. Then, using COMMAND_CENTER.md section 7 (current
focus) and the Definition of Done, name the single highest-leverage action to work right now
and why. Do not start building until I confirm the pick.
```

---

## 2. Enrich + review a queued action

```
Take action <id> from the queue (GET /api/action-queue). If it is not enriched, enrich it
(PATCH /api/action-queue/<id>/enrich — the server-side Gemini worker). Then critique the
resulting spec against COMMAND_CENTER's Definition of Done: is the goal one concrete money/
proof/distribution outcome? Are done_criteria individually verifiable? Are constraints real
guardrails? Tighten the prompt. Persist edits via PATCH /api/action-queue/<id>. Output the
final spec and say whether it is safe to dispatch to Jules.
```

---

## 3. Dispatch to Jules (operator-gated, plan-gated)

```
Action <id> is enriched and reviewed. Confirm it: (1) targets a repo connected in Jules
(GET /api/jules/sources), (2) has a clear goal + done_criteria, (3) is scoped to one slice.
If all three hold, dispatch it (POST /api/action-queue/<id>/jules with source + branch) with
requirePlanApproval:true. Report the session id and remind me to approve the plan in
jules.google.com before any repo changes. NEVER dispatch an un-enriched or unreviewed action,
and never flip requirePlanApproval to false without my explicit say-so.
```

---

## 4. Ship a vertical slice (PhotoSelect or varbees)

```
Build <slice> as a vertical slice for <PhotoSelect | varbees rateguard>. Definition of Done
(COMMAND_CENTER section 8): UI -> logic -> data -> wired -> deployed, happy path tested in the
real environment, error/empty states handled, no secrets in browser code. Do exactly this
slice; list follow-ups instead of silently expanding. End with the path/URL of what shipped
and the single highest-leverage next action.
```

---

## 5. End-of-day review (write durable memory)

```
Summarize today against COMMAND_CENTER section 7 input targets (features shipped, studios
onboarded, posts, replies, dollars). For each: actual vs target. Log one learned buyer truth
and one next move into the Obsidian vault (writeNote via the vault bridge) and update the
"Current Focus" section of COMMAND_CENTER.md. Progress = money/proof/distribution shipped, not
a new card.
```

---

## Codex (xhigh) note

Codex gets the same Boot prompt (section 0). Codex is best pointed at a single deployed spec:
run `npm run horizon` first, then hand Codex one `.horizon/queue/<id>.md` spec and prompt 4.
Keep Codex on implementation slices; keep Claude on triage, enrichment review, and dispatch
gating. Both update COMMAND_CENTER.md at the end of a task.
