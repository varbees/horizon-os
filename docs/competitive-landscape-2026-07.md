# Horizon OS — Competitive Landscape & Differentiation (July 2026)

## The landscape

Six categories of tools overlap with Horizon OS. None does everything it does.

### 1. Agent Frameworks (LangGraph, CrewAI, OpenAI Agents SDK)
- **What they do:** Build and orchestrate AI agents programmatically
- **Horizon difference:** They're libraries. Horizon is a control plane — you point it at a workspace and it becomes the cockpit for ALL your agents across ALL your projects. No code required to start.

### 2. Agent Observability (AgentOps, Laminar, LangSmith)
- **What they do:** Trace agent runs, monitor costs, debug failures
- **Horizon difference:** AgentOps requires installation per-project. Horizon observes everything from a single surface — Claude Code, Codex, DeepSeek, Jules — with a live streaming console. Also: Horizon grades results and feeds failure lessons back into future deploys (shipping soon).

### 3. AI Coding Agents (Claude Code, Cursor, Codex, Antigravity)
- **What they do:** One agent, one task, one repo at a time
- **Horizon difference:** Multi-agent dispatch. You don't choose between Claude Code for architecture and Codex for frontend — you deploy both from the same queue, with the same context blocks.

### 4. Local AI Assistants (OpenClaw, Open Interpreter)
- **What they do:** Autonomous agent on local hardware with skill-based architecture
- **Horizon difference:** OpenClaw is agent-first (you build one agent). Horizon is workspace-first — load a folder of 40+ repos, it sweeps them, graphs them, and any agent can target any project. OpenClaw's Mission Control Dashboard is a reference pattern we're stealing: live WebSocket telemetry, hierarchical task graphs.

### 5. Knowledge Graph Tools (Graphify)
- **What they do:** Convert codebase into queryable knowledge graph
- **Horizon difference:** Graphify is a component. Horizon uses it as the context engine — every deploy queries the graph for just the task at hand, budgeted to ~500 tokens. 10 repos graphed, 13,591 nodes, 27,354 edges.

### 6. Developer Portals (Backstage, Port, Compass)
- **What they do:** Service catalog, tech docs, developer experience
- **Horizon difference:** They're for organizations. Horizon is for a solo operator — revenue tracking, capital runway, job plan integration, consulting pipeline. It's a founder's cockpit, not a team's catalog.

## Horizon's unique position

| Capability | OpenClaw | AgentOps | LangGraph Studio | Claude Code | Horizon OS |
|---|---|---|---|---|---|
| Multi-agent dispatch | ✅ | ❌ | ❌ | ❌ | ✅ |
| Workspace-wide sweep | ❌ | ❌ | ❌ | ❌ | ✅ |
| Graph-as-context | ❌ | ❌ | ❌ | ❌ | ✅ |
| Live streaming console | ✅ | ✅ | ✅ | ❌ | ✅ |
| Revenue/capital tracking | ❌ | ❌ | ❌ | ❌ | ✅ |
| Obsidian vault bridge | ❌ | ❌ | ❌ | ❌ | ✅ |
| Job plan integration | ❌ | ❌ | ❌ | ❌ | ✅ |
| Internet-powered deploys | ❌ | ❌ | ❌ | ❌ | ✅ |
| Open source (MIT) | ✅ | Partial | ❌ | ❌ | ✅ |
| Zero-config start | ❌ | ❌ | ❌ | ❌ | ✅ |

## What to steal (highest ROI first)

1. **OpenClaw's Mission Control Dashboard** — WebSocket live telemetry, hierarchical task graphs, per-agent resource usage. Currently: we stream stdout. Target: full observability dashboard.
2. **AgentOps' passive tracing** — auto-instrument agent runs without code changes. Currently: manual dispatch logging. Target: automatic span capture for every Claude Code/Codex/DeepSeek call.
3. **LangGraph Studio's state modification** — pause mid-trajectory, edit state, resume. Currently: stop/redirect only. Target: live steering (v3 in workspace-alpha.md).
4. **ClawHub's skill marketplace** — reusable agent skills library. Currently: custom prompt templates. Target: a `skills/` directory with importable agent configurations.
