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

export async function addAction(action) {
  const response = await fetch("/api/action-queue", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!response.ok) throw new Error(`action add failed: ${response.status}`);
  return response.json();
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
