# Horizon Workspace Alpha — the graph IS the interface

**Created 2026-07-02. Vision owner: Harsha. This is the versioned contract for evolving /map into a Blender-grade agentic workspace — full-screen canvas, floating panels, live agent telemetry, steerable workflows. Build slice by slice; each slice must run end to end before the next starts.**

## The vision, in one paragraph

Load Horizon OS, point it at a workspace (`~/Desktop/bolting`), and the canvas becomes the operating surface: every project across every stack is a node, agents are visible actors moving across the graph, panels float over the canvas like Blender/modern render tools — inspector, routine, agent consoles. You watch each agent think in real time, talk to it, steer it mid-task. Multiple projects coordinating like a symphony. An advanced alpha prototype that actually runs, end to end, and is fun to operate.

## Engine decisions (researched 2026-07-02)

| Layer | Engine | Why |
|---|---|---|
| Command graph (~15-50 curated nodes) | **React Flow (@xyflow/react)** — SHIPPED | Editor semantics: drag, select, custom nodes, viewport `setCenter`, minimap. Right tool below ~1k nodes. |
| Codebase atlas (files/functions, thousands of nodes) | **cosmos.gl / Cosmograph (@cosmograph/react)** — future slice | GPU-accelerated force layout; renders hundreds of thousands of nodes; SVG/DOM approaches die past a few thousand. |
| Bespoke data-dense views (token heatmaps) | D3 primitives only where the above can't | Last resort, not default. |

Agent-observability prior art to steal from (all verified current): **LangGraph Studio** (modify state mid-trajectory, resume from checkpoint = the "steering" benchmark), **AgentOps** (local-first, passive hooks, live streaming), **Laminar** (OTel-native transcript view). We are not adopting these platforms — Horizon is local-first and already owns the executor layer — but their UX patterns define the bar.

## Slices

### v1 — Workspace mode ✅ SHIPPED 2026-07-02
Full-viewport canvas on /map; inspector + routine rail float over the graph; panel toggles; Esc exits. React Flow command graph with animated revenue path, dagre layouts, click-to-center.

### v2 — Live agent console (next)
The executors (`scripts/executors/{claude-code,codex}.mjs`) already spawn `claude -p` / `codex exec` as child processes. Slice:
1. Capture stdout/stderr line-streams per run into `.horizon/runs/<run-id>.ndjson` (append-only).
2. `GET /api/runs/:id/stream` — SSE endpoint tailing the ndjson.
3. Floating **Agent Console** panel in workspace mode: pick a running/recent dispatch, watch the transcript stream live, see status (running/exit code/duration).
4. Graph tie-in: while a run is live, the target project's node pulses (animated border) — the "AI traversal overlay," honest version: we highlight what IS running, we don't fake path animation.

### v3 — Steering
`claude -p` is one-shot; true mid-run steering needs session continuity. Realistic mechanics, in order:
1. **Stop** — kill the child process from the console panel (already have PIDs).
2. **Redirect** — queue a follow-up dispatch pre-filled with the transcript tail + operator note ("continue, but X").
3. **Interactive lane** — for Claude Code specifically, `claude --resume <session>` / Agent SDK sessions enable genuine continue-with-feedback; wire when v2 proves daily use.

### v4 — Codebase atlas (the Graphify layer)
Input exists: `project-sweep.mjs` already indexes 83 projects / 51 repos. Extend per-repo: parse import/require graphs (start JS/TS + Go with simple regex/ts-morph passes, not a universal parser). Render with Cosmograph in a new workspace tab:
- **Semantic clustering** by directory + import affinity (force layout does this naturally).
- **Impact radius**: hover node → highlight transitive dependents (BFS over import edges).
- **Token map**: per-file token estimate (chars/4) as node size/heat — the "prune context before feeding the model" view.
- Contextual side panel: file summary via DeepSeek (cheap lane), open in editor.

### v5 — Workspace onboarding
First-run flow: pick a root directory → sweep runs → graph builds itself → operator names the lanes. What "load Horizon OS and point it at a workspace" means concretely. Requires v4's parser layer to feel magical; until then the curated command graph is the front door.

## Rules
- Every slice ships against the real `.horizon/horizon.sqlite` and real executors — no simulated panels (the old calendar's "Simulated agent response" is the anti-pattern; it got killed for a reason).
- Light-first, existing tokens, 27" density. Panels float; the canvas never shrinks into a card.
- DeepSeek is the default model for trivial enrichment; Claude/Codex remain the heavy executors.
