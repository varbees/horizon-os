export async function fetchWorkspace() {
  const res = await fetch("/api/workspace");
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `workspace unavailable: ${res.status}`);
  return data;
}

export async function setWorkspace(root) {
  const res = await fetch("/api/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ root }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `set workspace failed: ${res.status}`);
  return data;
}
