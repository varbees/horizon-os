async function readJson(response, label) {
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) throw new Error(data.error || `${label} failed: ${response.status}`);
  return data;
}

export async function fetchConnectors() {
  const response = await fetch("/api/connectors");
  return readJson(response, "connectors");
}

export async function checkConnectorHealth(id) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/health`, { method: "POST" });
  return readJson(response, "connector health");
}

export async function connectConnector(id) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/connect`, { method: "POST" });
  return readJson(response, "connector connect");
}

export async function connectorTools(id) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/tools`, { method: "POST" });
  return readJson(response, "connector tools");
}

export async function connectorCall(id, name, args = {}) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/call`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  return readJson(response, "connector call");
}

export async function disconnectConnector(id) {
  const response = await fetch(`/api/connectors/${encodeURIComponent(id)}/disconnect`, { method: "POST" });
  return readJson(response, "connector disconnect");
}

export async function fetchMcp() {
  const response = await fetch("/api/mcp");
  return readJson(response, "mcp");
}

export const connectMcp = connectConnector;
export const mcpTools = connectorTools;
export const mcpCall = connectorCall;
export const disconnectMcp = disconnectConnector;
