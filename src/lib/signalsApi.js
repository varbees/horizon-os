export async function fetchSignals() {
  const response = await fetch("/api/signals");
  if (!response.ok) throw new Error(`signals unavailable: ${response.status}`);
  return response.json();
}

export async function refreshSignals() {
  const response = await fetch("/api/signals/refresh", { method: "POST" });
  if (!response.ok) throw new Error(`signals refresh failed: ${response.status}`);
  return response.json();
}

export async function setSignalStatus(id, status) {
  const response = await fetch(`/api/signals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error(`signal update failed: ${response.status}`);
  return response.json();
}

export async function addSignalSource(source) {
  const response = await fetch("/api/signal-sources", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(source),
  });
  if (!response.ok) throw new Error(`source add failed: ${response.status}`);
  return response.json();
}

export async function deleteSignalSource(id) {
  const response = await fetch(`/api/signal-sources/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`source delete failed: ${response.status}`);
  return response.json();
}
