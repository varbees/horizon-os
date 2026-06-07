export async function fetchVault() {
  const response = await fetch("/api/vault");
  if (!response.ok) throw new Error(`vault unavailable: ${response.status}`);
  return response.json();
}

export async function syncVault() {
  const response = await fetch("/api/vault/sync", { method: "POST" });
  if (!response.ok) throw new Error(`vault sync failed: ${response.status}`);
  return response.json();
}

export async function readVaultNote(path) {
  const response = await fetch(`/api/vault/note?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`note read failed: ${response.status}`);
  return response.json();
}

export async function fetchWiki() {
  const response = await fetch("/api/wiki");
  if (!response.ok) throw new Error(`wiki unavailable: ${response.status}`);
  return response.json();
}

export async function syncWiki() {
  const response = await fetch("/api/wiki/sync", { method: "POST" });
  if (!response.ok) throw new Error(`wiki sync failed: ${response.status}`);
  return response.json();
}

export async function searchWiki(query, limit = 8) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`/api/wiki/search?${params.toString()}`);
  if (!response.ok) throw new Error(`wiki search failed: ${response.status}`);
  return response.json();
}
