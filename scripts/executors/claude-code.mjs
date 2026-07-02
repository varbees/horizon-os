import { runCommand, probeVersion } from "./_run.mjs";

// Claude Code as a NATIVE Horizon executor — no external Anthropic API key. We shell the local
// `claude` CLI in headless print mode (`claude -p ... --output-format json`), which runs on the
// operator's own Claude Code subscription auth. This is the "like openclaw/hermes, without
// external API" integration: reasoning, research dossiers, narrative, and asset specs run on the
// strongest model the operator already pays for, driven by the engine's own prompts.
//
// Baseline ships here (synchronous run helper + health probe + a registry adapter that wraps an
// in-memory job map). Codex task X1 hardens it: async job tracking, --max-turns/--mcp-config
// passthrough so content lanes can reach HuggingFace/Higgsfield, stream-json, and pipeline_runs
// reconcile.

const COMMAND = process.env.HORIZON_CLAUDE_CMD ?? "claude";

// Run one headless Claude Code turn. Never throws — returns a structured result the caller can
// branch on (and fall back to handoff if the CLI is absent or unauthenticated).
export async function runClaudeCode(prompt, { timeoutMs = 180000, maxTurns, cwd, mcpConfig, allowedTools } = {}) {
  const args = ["-p", "--output-format", "json"];
  if (maxTurns) args.push("--max-turns", String(maxTurns));
  if (mcpConfig) args.push("--mcp-config", mcpConfig);
  if (allowedTools) args.push("--allowed-tools", allowedTools);

  const started = Date.now();
  const res = await runCommand({ command: COMMAND, args, input: prompt, timeoutMs, cwd });
  const durationMs = Date.now() - started;

  if (!res.ok) {
    return { ok: false, result: "", json: null, raw: res.stdout, durationMs, error: res.error || res.stderr || `exit ${res.code}` };
  }

  // Headless json envelope: { type:"result", subtype, is_error, result, session_id, num_turns, ... }
  let envelope = null;
  try {
    envelope = JSON.parse(res.stdout);
  } catch {
    // older CLI or plain text — treat raw stdout as the result
    return { ok: true, result: res.stdout.trim(), json: null, raw: res.stdout, durationMs, error: "" };
  }

  if (envelope?.is_error) {
    return { ok: false, result: String(envelope.result ?? ""), json: null, raw: res.stdout, durationMs, error: envelope.subtype || "claude_error" };
  }

  const resultText = typeof envelope?.result === "string" ? envelope.result : JSON.stringify(envelope?.result ?? "");
  // Lanes ask for JSON-only output, so try to parse the result body into an object too.
  let json = null;
  try {
    json = JSON.parse(stripFences(resultText));
  } catch {
    json = null;
  }
  return { ok: true, result: resultText, json, raw: res.stdout, durationMs, error: "", sessionId: envelope?.session_id ?? "" };
}

function stripFences(text) {
  const trimmed = String(text ?? "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export function claudeCodeHealth() {
  return probeVersion(COMMAND);
}

// In-memory job map for the registry contract. The vertical-slice content endpoint calls
// runClaudeCode directly; the adapter exists so the engine knows this executor exists (Connectors
// hub) and so Codex's X1 can wire the async dispatch/poll/reconcile loop without a core change.
const jobs = new Map();

export const claudeCodeAdapter = {
  name: "claude-code",
  capability: { mode: "local", planGated: false, repoWrite: true },
  dispatch(action) {
    const externalId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(externalId, { state: "in_progress", result: null });
    runClaudeCode(action.prompt, { cwd: action.cwd, maxTurns: action.maxTurns })
      .then((out) => jobs.set(externalId, { state: out.ok ? "completed" : "failed", result: out }))
      .catch((error) => jobs.set(externalId, { state: "failed", result: { ok: false, error: String(error?.message ?? error) } }));
    return { externalId };
  },
  poll(externalId) {
    const job = jobs.get(externalId);
    return { state: job?.state ?? "in_progress", externalId };
  },
  reconcile(externalId) {
    const job = jobs.get(externalId);
    return {
      result: { state: job?.state ?? "in_progress", output: job?.result ?? null },
      workEvent: { kind: "executor.claude-code", payload: { externalId, state: job?.state ?? "in_progress" } },
    };
  },
};
