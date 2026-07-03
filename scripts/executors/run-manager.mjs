import { spawn } from "node:child_process";

// Live run-manager: the backend behind the Agents "live console". Unlike _run.mjs
// (buffer-then-resolve), this streams a child process's output line-by-line to any
// number of SSE subscribers, keeps a ring buffer so late subscribers catch up, and
// can kill an in-flight run. Runner-agnostic — the API builds the command spec
// (claude / codex / a safe demo) and hands it here.

const runs = new Map();
const MAX_CHUNKS = 500;
let seq = 0;

function broadcast(run, event) {
  const line = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of run.subscribers) {
    try {
      res.write(line);
    } catch {
      run.subscribers.delete(res);
    }
  }
}

function pushChunk(run, stream, text) {
  const chunk = { t: Date.now(), stream, text };
  run.chunks.push(chunk);
  if (run.chunks.length > MAX_CHUNKS) run.chunks.shift();
  broadcast(run, { type: "chunk", ...chunk });
}

/**
 * Start a live run. spec = { actionId, agent, title, command, args, input, cwd, timeoutMs }.
 * Returns the run summary (no child handle).
 */
export function startRun(spec) {
  const id = `run-${Date.now()}-${(seq += 1)}`;
  const run = {
    id,
    actionId: spec.actionId ?? "",
    agent: spec.agent ?? "demo",
    title: spec.title ?? "run",
    status: "running",
    startedAt: new Date().toISOString(),
    endedAt: null,
    exitCode: null,
    chunks: [],
    subscribers: new Set(),
    child: null,
  };
  runs.set(id, run);

  let child;
  try {
    child = spawn(spec.command, spec.args ?? [], { cwd: spec.cwd, stdio: ["pipe", "pipe", "pipe"] });
  } catch (error) {
    run.status = "failed";
    run.endedAt = new Date().toISOString();
    pushChunk(run, "system", `spawn failed: ${String(error?.message ?? error)}`);
    return summary(run);
  }
  run.child = child;
  pushChunk(run, "system", `▶ ${spec.agent} started in ${spec.cwd || "."}`);

  const timeoutMs = spec.timeoutMs ?? 300000;
  const timer = setTimeout(() => {
    if (run.status === "running") {
      pushChunk(run, "system", "⏱ timeout — killing run");
      try { child.kill("SIGKILL"); } catch { /* noop */ }
    }
  }, timeoutMs);

  child.stdout.on("data", (d) => pushChunk(run, "stdout", d.toString("utf8")));
  child.stderr.on("data", (d) => pushChunk(run, "stderr", d.toString("utf8")));
  child.on("error", (error) => {
    const msg = error?.code === "ENOENT" ? `CLI not found: ${spec.command}` : String(error?.message ?? error);
    pushChunk(run, "system", `✖ ${msg}`);
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    if (run.status === "running") run.status = code === 0 ? "completed" : run.status === "stopped" ? "stopped" : "failed";
    run.exitCode = code;
    run.endedAt = new Date().toISOString();
    pushChunk(run, "system", `■ ${run.status} (exit ${code})`);
    broadcast(run, { type: "end", status: run.status, exitCode: code });
  });

  if (spec.input) {
    try { child.stdin.write(spec.input); } catch { /* noop */ }
  }
  try { child.stdin.end(); } catch { /* noop */ }

  return summary(run);
}

export function subscribe(runId, res) {
  const run = runs.get(runId);
  if (!run) return false;
  res.write(`event: init\ndata: ${JSON.stringify(summary(run))}\n\n`);
  for (const chunk of run.chunks) res.write(`event: chunk\ndata: ${JSON.stringify({ type: "chunk", ...chunk })}\n\n`);
  if (run.status !== "running") res.write(`event: end\ndata: ${JSON.stringify({ type: "end", status: run.status, exitCode: run.exitCode })}\n\n`);
  run.subscribers.add(res);
  return true;
}

export function unsubscribe(runId, res) {
  runs.get(runId)?.subscribers.delete(res);
}

export function stopRun(runId) {
  const run = runs.get(runId);
  if (!run) return { ok: false, error: "run_not_found" };
  if (run.status !== "running") return { ok: true, status: run.status };
  run.status = "stopped";
  pushChunk(run, "system", "⏹ stop requested by operator");
  try { run.child?.kill("SIGKILL"); } catch { /* noop */ }
  return { ok: true, status: "stopped" };
}

export function getRun(runId) {
  const run = runs.get(runId);
  return run ? { ...summary(run), chunks: run.chunks } : null;
}

export function listRuns() {
  return [...runs.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 40).map(summary);
}

function summary(run) {
  return {
    id: run.id,
    actionId: run.actionId,
    agent: run.agent,
    title: run.title,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    exitCode: run.exitCode,
    chunkCount: run.chunks.length,
  };
}
