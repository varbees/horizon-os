export async function fetchCapital() {
  const response = await fetch("/api/capital");
  if (!response.ok) throw new Error(`capital unavailable: ${response.status}`);
  return response.json();
}

export async function updateRunway(state) {
  const response = await fetch("/api/capital/runway", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) throw new Error(`runway update failed: ${response.status}`);
  return response.json();
}

export async function updateCapitalTarget(id, patch) {
  const response = await fetch(`/api/capital/targets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`target update failed: ${response.status}`);
  return response.json();
}

export async function addLedgerEntry(entry) {
  const response = await fetch("/api/capital/ledger", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error(`ledger add failed: ${response.status}`);
  return response.json();
}

export async function deleteLedgerEntry(id) {
  const response = await fetch(`/api/capital/ledger/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`ledger delete failed: ${response.status}`);
  return response.json();
}

export async function updatePipelineStage(id, patch) {
  const response = await fetch(`/api/capital/pipeline/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`pipeline update failed: ${response.status}`);
  return response.json();
}
