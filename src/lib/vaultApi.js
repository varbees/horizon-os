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
