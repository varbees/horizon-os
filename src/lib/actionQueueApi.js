export async function fetchActionQueue() {
  const response = await fetch("/api/action-queue");
  if (!response.ok) throw new Error(`action queue unavailable: ${response.status}`);
  return response.json();
}

export async function updateAction(id, patch) {
  const response = await fetch(`/api/action-queue/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`action update failed: ${response.status}`);
  return response.json();
}

export async function deployAction(id) {
  const response = await fetch(`/api/action-queue/${encodeURIComponent(id)}/deploy`, { method: "PATCH" });
  if (!response.ok) throw new Error(`action deploy failed: ${response.status}`);
  return response.json();
}

export async function enrichActionWithGemini(id) {
  const response = await fetch(`/api/action-queue/${encodeURIComponent(id)}/enrich`, { method: "PATCH" });
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) throw new Error(data.error || `enrich failed: ${response.status}`);
  return data;
}

export async function fetchJulesSources() {
  const response = await fetch("/api/jules/sources");
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) throw new Error(data.error || `jules sources failed: ${response.status}`);
  return data.sources ?? [];
}

export async function dispatchToJules(id, body) {
  const response = await fetch(`/api/action-queue/${encodeURIComponent(id)}/jules`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) {
    const err = new Error(data.error || `jules dispatch failed: ${response.status}`);
    err.sources = data.sources;
    throw err;
  }
  return data;
}

export async function addAction(action) {
  const response = await fetch("/api/action-queue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!response.ok) throw new Error(`action add failed: ${response.status}`);
  return response.json();
}

export async function fetchTrust() {
  const response = await fetch("/api/trust");
  if (!response.ok) throw new Error(`trust unavailable: ${response.status}`);
  return response.json();
}

export async function fetchLoopStatus() {
  const response = await fetch("/api/loop/status");
  if (!response.ok) throw new Error(`loop status failed: ${response.status}`);
  return response.json();
}

export async function runLoopCycle(body) {
  const response = await fetch("/api/loop/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) throw new Error(data.error || `loop run failed: ${response.status}`);
  return data;
}

export async function generateRevenueActions(options = {}) {
  const response = await fetch("/api/revenue-actions/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error(`revenue action generation failed: ${response.status}`);
  return response.json();
}
