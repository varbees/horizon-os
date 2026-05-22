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

export async function fetchCalendarEvents() {
  const response = await fetch("/api/calendar/events");
  if (!response.ok) throw new Error(`calendar events unavailable: ${response.status}`);
  return response.json();
}

export async function createCalendarEvent(event) {
  const response = await fetch("/api/calendar/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`calendar event create failed: ${response.status}`);
  return response.json();
}

export async function updateCalendarEvent(id, event) {
  const response = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`calendar event update failed: ${response.status}`);
  return response.json();
}

export async function deleteCalendarEvent(id) {
  const response = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`calendar event delete failed: ${response.status}`);
  return response.json();
}
