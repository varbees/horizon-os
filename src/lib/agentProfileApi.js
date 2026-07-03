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
