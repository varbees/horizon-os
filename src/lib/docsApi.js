export async function fetchDocs() {
  const res = await fetch("/api/docs");
  if (!res.ok) throw new Error(`docs unavailable: ${res.status}`);
  return res.json();
}

export async function readDoc(path) {
  const res = await fetch(`/api/docs/read?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `read failed: ${res.status}`);
  return data;
}

export async function revealPath(path) {
  const res = await fetch(`/api/reveal?path=${encodeURIComponent(path)}`, { method: "POST" });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `reveal failed: ${res.status}`);
  return data;
}
