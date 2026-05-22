export async function fetchCommandBase() {
  const response = await fetch("/api/command-base");
  if (!response.ok) throw new Error(`command base unavailable: ${response.status}`);
  return response.json();
}

export async function persistNodePosition(id, x, y) {
  const response = await fetch(`/api/nodes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ x, y }),
  });
  if (!response.ok) throw new Error(`node position save failed: ${response.status}`);
  return response.json();
}

export async function createCommandTask(task) {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error(`task create failed: ${response.status}`);
  return response.json();
}
