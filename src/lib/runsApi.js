// Live-run control. The stream itself is consumed via EventSource in LiveConsole.

export async function startLiveRun(actionId, runner) {
  const res = await fetch(`/api/action-queue/${encodeURIComponent(actionId)}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runner }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `run failed: ${res.status}`);
  return data.run;
}

export async function stopLiveRun(runId) {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/stop`, { method: "POST" });
  return res.json().catch(() => ({ ok: false }));
}

export async function fetchLiveRuns() {
  const res = await fetch("/api/runs");
  const data = await res.json().catch(() => ({ ok: false, runs: [] }));
  return data.runs ?? [];
}
