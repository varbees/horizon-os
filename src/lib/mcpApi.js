export async function fetchMcp() {
  const response = await fetch("/api/mcp");
  if (!response.ok) throw new Error(`mcp unavailable: ${response.status}`);
  return response.json();
}

export async function connectMcp(id) {
  const response = await fetch(`/api/mcp/${encodeURIComponent(id)}/connect`, { method: "POST" });
  return response.json();
}

export async function mcpTools(id) {
  const response = await fetch(`/api/mcp/${encodeURIComponent(id)}/tools`, { method: "POST" });
  return response.json();
}

export async function mcpCall(id, name, args = {}) {
  const response = await fetch(`/api/mcp/${encodeURIComponent(id)}/call`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  return response.json();
}

export async function disconnectMcp(id) {
  const response = await fetch(`/api/mcp/${encodeURIComponent(id)}/disconnect`, { method: "POST" });
  return response.json();
}
