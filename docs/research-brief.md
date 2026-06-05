# Horizon OS — Deep Research Brief (v3, needs-first)

## Why this version exists (read before using)

Five AI tools already researched the earlier versions of this brief. Four of them
(Perplexity, Gemini, ChatGPT, and the first draft) independently produced the *same*
elaborate architecture — payment-webhook ingestion, `revenue_events` tables, MRR/ROI math,
FTS5 memory schemas, build-in-public funnel dashboards — for a founder who has **zero
revenue and zero audience**. One of them invented a database schema. They did this because
the brief *listed candidate features*, so each tool dutifully designed those features. Only
one tool ignored the list and asked whether any of it moves money today; its answer was no.

So this version **names no candidate features and no tools.** Listing them seeds the answer.
Your job is not to evaluate a feature list — it is to diagnose, from the founder's real
situation, what Horizon actually needs (which may be "almost nothing"), and to protect his
time. Padding the answer with impressive architecture is the failure mode, not the goal.

## How to run this

- **If you can read the repo (e.g. Claude Code):** read `COMMAND_CENTER.md`, then
  `docs/operating-loop.md`, `docs/portfolio-monetization-map.md`, `docs/agent-prompts.md`,
  and skim `scripts/horizon-loop.mjs`, `scripts/project-sweep.mjs`, `scripts/git-detail.mjs`.
  Ground every claim in what is actually there; cite file paths.
- **If you are web-only:** use the facts below as ground truth. Do not assume Horizon needs
  any capability it doesn't already have — argue for it from the founder's goal, or don't.

## The founder and the real situation (the only lens that matters)

- Solo, faceless developer-founder. No team, no calls, no jobs, no paid ads, low burn.
- **Revenue: ₹0 / $0.** No paying customer has ever paid for anything.
- **Audience: ~0.** Near-zero followers and near-zero posts under either identity.
- **Two real, pre-revenue products:** PhotoSelect (a live B2B SaaS for Indian wedding/event
  studios — built, deployed, but no paying studio yet) and rateguard (3 working SDKs, not
  open-sourced yet).
- **A documented tendency to build tooling instead of shipping product.** The founder keeps
  improving his personal command-center ("Horizon OS") because building a tool to manage his
  building *feels* like progress. Treat this as the central risk in your analysis.
- **Horizon OS already exists and works:** a local-first command center that sweeps his git
  repos under `~/Desktop/bolting/*`, ranks projects by a money verdict, shows per-project git
  status, and queues tasks for AI agents. It is built. The live question is *what now*.

## The prime directive (the only ranking rule)

Score every recommendation by one question:

> **Does this raise the probability that a stranger pays him money within the next 30 days?**

Anything that instruments, measures, remembers, or optimizes something that **does not exist
yet** (revenue, an audience, months of usage history) scores **zero** today — say so plainly.
Rank ruthlessly. A short, blunt answer that says "stop building the tool" beats a long one
full of schemas.

## The questions (diagnostic — derive the need, don't pick from a menu)

1. **The bottleneck.** For *this* founder, today, what is the single biggest thing between
   him and a first paying customer? Decide honestly whether it is a tooling gap at all, or
   whether it is execution (shipping PhotoSelect's paid path, talking to studios, posting in
   public). You are allowed — encouraged — to conclude "the tool is not the bottleneck."

2. **Horizon's one job.** If Horizon may keep exactly **one** job, what should it be and why?
   What is everything else it does (or that someone might add) costing him in focus and time?

3. **The waste audit.** Name what — in Horizon today or in any tempting addition — is
   *sophisticated procrastination*: work that feels productive but moves no money. Give the
   concrete tripwires that signal he's polishing the workshop instead of doing the job.

4. **The trigger map.** For each capability worth deferring (not building now), state the
   concrete revenue/audience/usage threshold that should unlock it later, so good ideas are
   *gated*, not lost. Example shape: "Build X only once Y is true." You choose X and Y.

5. **Only if it survives the prime directive:** the realistic faceless-distribution path from
   zero (channels, cadence, what actually converts developers/founders), and — separately —
   whether any external code is worth *reading for patterns* (never installing; audit before
   trust; assume agent frameworks carry real CVEs and malicious plugins). If neither passes
   the directive at this stage, say so and move on.

## Required output (in this order)

1. **The honest priority list** — the real next 3–5 moves ranked by the prime directive, even
   if all of them are *outside* Horizon (ship the paid waitlist, onboard a studio by hand,
   open-source rateguard, post daily). Be specific to this founder.
2. **The bounded Horizon verdict** — one paragraph: freeze, trim, or extend? State exactly
   what Horizon is allowed to be at ₹0 revenue and the single line it must not cross. "Freeze
   it, it's already enough" is an acceptable and possibly correct answer.
3. **The trigger table** — deferred capability → the threshold that unlocks it → the smallest
   first slice to build *when* it unlocks.
4. **Read-list (not clone-list)** — only patterns/sources that survive the directive, each
   with a one-line "why" and a security/maintenance caveat. Cite sources for external claims.

## Hard refusals (call these out if you catch yourself or another answer doing them)

- Designing revenue/MRR/ROI/"money-relevance" schemas while revenue is ₹0.
- Instrumenting a posts→followers→leads funnel with no posts and no followers.
- Adding memory/learning to improve actions that don't yet produce money.
- Proposing to import any agent framework's runtime or marketplace into a system that will
  hold payment secrets.
- Any plan whose first concrete step is a Horizon feature rather than a customer-facing move.

If most tempting ideas fall here, the correct deliverable is: "money impact ≈ zero; freeze the
tool and go do [the specific customer-facing work]." That is a successful research outcome,
not a failure to find features.
