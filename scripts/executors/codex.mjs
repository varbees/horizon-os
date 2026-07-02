import { runCommand, probeVersion } from "./_run.mjs";

// Codex as a NATIVE Horizon executor — no external OpenAI API key. We shell the local `codex`
// CLI in non-interactive mode (`codex exec`), which runs on the operator's ChatGPT plan auth
// (gpt-5.5 xhigh by default on that account; do NOT pass `-m gpt-5.5-codex` — it fails there).
// Codex is the implementation/reproducible-tooling lane: glue scripts, scrapers, repo changes.
//
// Baseline ships here; Codex task X1 hardens it (async jobs, sandbox/approval flags, timeouts,
// pipeline_runs reconcile). Prompt is streamed over stdin to avoid arg-escaping limits.

const COMMAND = process.env.HORIZON_CODEX_CMD ?? "codex";

export async function runCodex(prompt, { timeoutMs = 240000, cwd, extraArgs = [] } = {}) {
  const args = ["exec", ...extraArgs];
  const started = Date.now();
  const res = await runCommand({ command: COMMAND, args, input: prompt, timeoutMs, cwd });
  const durationMs = Date.now() - started;

  if (!res.ok) {
    return { ok: false, result: "", raw: res.stdout, durationMs, error: res.error || res.stderr || `exit ${res.code}` };
  }
  return { ok: true, result: res.stdout.trim(), raw: res.stdout, durationMs, error: "" };
}

export function codexHealth() {
  return probeVersion(COMMAND);
}

const jobs = new Map();

export const codexAdapter = {
  name: "codex",
  capability: { mode: "local", planGated: false, repoWrite: true },
  dispatch(action) {
    const externalId = `cx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(externalId, { state: "in_progress", result: null });
    runCodex(action.prompt, { cwd: action.cwd })
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
      workEvent: { kind: "executor.codex", payload: { externalId, state: job?.state ?? "in_progress" } },
    };
  },
};
