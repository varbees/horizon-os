export async function fetchConnectors() {
  const response = await fetch("/api/connectors");
  if (!response.ok) throw new Error(`connectors unavailable: ${response.status}`);
  return response.json();
}

export async function checkConnectorHealth(id) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/health`, { method: "POST" });
  return response.json();
}
