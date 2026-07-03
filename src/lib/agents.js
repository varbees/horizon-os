// The deployable agent workforce + the action verbs, and the one function that
// turns "this card + this agent + this action" into a real action-queue entry.
//
// Runners (claude-code, codex, jules, handoff) map to scripts/executors/*.
// Providers (deepseek, gemini, nim, openai, anthropic) map to llm-providers.mjs
// and run the model against the action via /enrich. Everything routes through the
// existing horizon-api — nothing here is a fake button.

export const AGENTS = [
  {
    id: "claude-code",
    apiAgent: "claude",
    label: "Claude Code",
    kind: "runner",
    mode: "deploy",
    blurb: "Hardest 10% — architecture, security, audits. Writes a runnable spec to the queue + vault.",
    repoWrite: true,
  },
  {
    id: "codex",
    apiAgent: "codex",
    label: "Codex",
    kind: "runner",
    mode: "deploy",
    blurb: "Frontend lane. gpt-5.5 xhigh. Deploys a spec for the local Codex runner.",
    repoWrite: true,
  },
  {
    id: "deepseek",
    apiAgent: "deepseek",
    label: "DeepSeek",
    kind: "provider",
    mode: "enrich",
    blurb: "Bulk workhorse. Cheap. Runs the model against this item to enrich / draft.",
    repoWrite: false,
  },
  {
    id: "gemini",
    apiAgent: "gemini",
    label: "Gemini",
    kind: "provider",
    mode: "enrich",
    blurb: "Fast Google model for enrichment and summaries.",
    repoWrite: false,
  },
  {
    id: "jules",
    apiAgent: "jules",
    label: "Jules",
    kind: "runner",
    mode: "jules",
    blurb: "Async repo work on a connected GitHub source. Needs a repo selected.",
    repoWrite: true,
    needsSource: true,
  },
  {
    id: "handoff",
    apiAgent: "handoff",
    label: "Manual / You",
    kind: "human",
    mode: "deploy",
    blurb: "Stage a clean spec for a human to run. No model spend.",
    repoWrite: false,
  },
];

export const ACTIONS = [
  { id: "draft", label: "Draft", verb: "Draft", hint: "Produce a first version" },
  { id: "research", label: "Research", verb: "Research", hint: "Gather + synthesize context" },
  { id: "implement", label: "Implement", verb: "Implement", hint: "Write the code / change" },
  { id: "review", label: "Review", verb: "Review", hint: "Audit for correctness + risk" },
  { id: "summarize", label: "Summarize", verb: "Summarize", hint: "Compress to the essentials" },
  { id: "plan", label: "Plan", verb: "Plan", hint: "Break into sequenced steps" },
  { id: "outreach", label: "Outreach", verb: "Write outreach for", hint: "Buyer-facing message" },
];

export function agentById(id) {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0];
}

// Compose a runnable prompt for the chosen action against an entity.
export function buildPrompt({ action, entity }) {
  const verb = action?.verb ?? "Action on";
  const lines = [`${verb}: ${entity?.title ?? "this item"}.`];
  if (entity?.subtitle) lines.push(entity.subtitle);
  if (entity?.body) lines.push("", entity.body);
  if (entity?.source) lines.push("", `Source: ${entity.source}`);
  if (entity?.project_id) lines.push(`Project: ${entity.project_id}`);
  if (Array.isArray(entity?.meta)) {
    for (const m of entity.meta) if (m?.label && m?.value) lines.push(`${m.label}: ${m.value}`);
  }
  return lines.join("\n");
}

async function postJson(pathname, body, method = "POST") {
  const res = await fetch(pathname, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${pathname} failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Offline / frontend-only fallback: stage the action in localStorage so the
// button is never a dead end when the SQLite API isn't running.
function stageLocally(action) {
  try {
    const key = "horizon.stagedActions";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const entry = { ...action, id: `staged-${Date.now()}`, stagedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify([entry, ...prev].slice(0, 50)));
    return entry;
  } catch {
    return { ...action, id: `staged-${Date.now()}` };
  }
}

/**
 * Deploy an entity to an agent. Returns a normalized result:
 *   { ok, id, mode, agent, staged?, path?, detail, needsSource?, sources? }
 */
export async function deployEntity({ entity, agentId, model, actionId, source } = {}) {
  const agent = agentById(agentId);
  const action = ACTIONS.find((a) => a.id === actionId) ?? ACTIONS[0];
  const prompt = buildPrompt({ action, entity });
  const payload = {
    title: `${action.verb}: ${entity?.title ?? "action"}`.slice(0, 140),
    summary: entity?.subtitle ?? entity?.body?.slice(0, 200) ?? "",
    source: entity?.source ? `horizon:${entity.type}` : "horizon-inspector",
    project_id: entity?.project_id ?? "",
    project_path: entity?.projectPath ?? "",
    agent: agent.apiAgent,
    prompt,
    impact: entity?.impact ?? "normal",
    status: "suggested",
  };

  let created;
  try {
    created = await postJson("/api/action-queue", payload);
  } catch (error) {
    // API not up → stage locally, still a real, recoverable artifact.
    const staged = stageLocally({ ...payload, model, actionLabel: action.label });
    return {
      ok: true,
      staged: true,
      id: staged.id,
      mode: agent.mode,
      agent: agent.label,
      detail: `Staged locally (API offline). Start the API to sync.`,
    };
  }

  const id = created.id;
  try {
    if (agent.mode === "jules") {
      if (!source) {
        // caller must present a source picker
        let sources = [];
        try {
          const sres = await fetch("/api/jules/sources").then((r) => r.json());
          sources = sres.sources ?? [];
        } catch {
          /* ignore */
        }
        return { ok: false, needsSource: true, sources, id, mode: "jules", agent: agent.label, detail: "Pick a connected repo for Jules." };
      }
      const out = await postJson(`/api/action-queue/${encodeURIComponent(id)}/jules`, { source, prompt });
      return { ok: true, id, mode: "jules", agent: agent.label, detail: `Dispatched to Jules session ${out.sessionId ?? ""}.`.trim() };
    }

    if (agent.mode === "enrich") {
      const out = await postJson(
        `/api/action-queue/${encodeURIComponent(id)}/enrich`,
        { provider: agent.apiAgent, model: model || undefined },
        "PATCH",
      );
      return { ok: true, id, mode: "enrich", agent: agent.label, detail: `${agent.label} ran on this item.`, result: out };
    }

    // default: deploy a runnable spec (claude-code / codex / handoff)
    const out = await postJson(`/api/action-queue/${encodeURIComponent(id)}/deploy`, {}, "PATCH");
    return { ok: true, id, mode: "deploy", agent: agent.label, detail: `Spec deployed for ${agent.label}.`, path: out.path };
  } catch (error) {
    return { ok: false, id, mode: agent.mode, agent: agent.label, detail: error.message || "Deploy failed.", error };
  }
}

// Live model catalog merged with the static agent list, for the model dropdown.
export async function fetchModelCatalog() {
  try {
    const data = await fetch("/api/ai-models").then((r) => r.json());
    const byId = Object.fromEntries((data.providers ?? []).map((p) => [p.id, p]));
    return { ok: true, byId, providers: data.providers ?? [] };
  } catch {
    return { ok: false, byId: {}, providers: [] };
  }
}
