export async function fetchAgentProfile() {
  const res = await fetch("/api/agent-profile");
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `profile unavailable: ${res.status}`);
  return data;
}

export async function saveAgentProfile(profile) {
  const res = await fetch("/api/agent-profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `save failed: ${res.status}`);
  return data;
}

export async function fetchGraphSummary(path) {
  const res = await fetch(`/api/graph/summary${path ? `?path=${encodeURIComponent(path)}` : ""}`);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `graph summary failed: ${res.status}`);
  return data;
}

export async function fetchAffected(path, node, depth = 2) {
  const res = await fetch(`/api/graph/affected?path=${encodeURIComponent(path || "")}&node=${encodeURIComponent(node)}&depth=${depth}`);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `affected failed: ${res.status}`);
  return data;
}

export async function fetchDeps() {
  const res = await fetch("/api/deps");
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `deps failed: ${res.status}`);
  return data;
}

export async function indexDependency(name) {
  const res = await fetch("/api/deps/index", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `index failed: ${res.status}`);
  return data;
}

// Grade a run's result → stored as a lesson that feeds future agent context.
export async function gradeRun(actionId, grade, note = "") {
  const res = await fetch(`/api/action-queue/${encodeURIComponent(actionId)}/grade`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ grade, note }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `grade failed: ${res.status}`);
  return data;
}

export async function fetchLessons() {
  const res = await fetch("/api/lessons");
  const data = await res.json().catch(() => ({ ok: false, lessons: [] }));
  return data;
}

export async function buildGraph(path) {
  const res = await fetch("/api/graph/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `build failed: ${res.status}`);
  return data;
}
