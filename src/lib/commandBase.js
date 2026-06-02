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

export async function fetchCommandTasks() {
  const response = await fetch("/api/tasks");
  if (!response.ok) throw new Error(`tasks unavailable: ${response.status}`);
  return response.json();
}

export async function updateCommandTask(id, task) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error(`task update failed: ${response.status}`);
  return response.json();
}

export async function deleteCommandTask(id) {
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`task delete failed: ${response.status}`);
  return response.json();
}

export async function fetchJourneyEntries() {
  const response = await fetch("/api/journey");
  if (!response.ok) throw new Error(`journey unavailable: ${response.status}`);
  return response.json();
}

export async function createJourneyEntry(entry) {
  const response = await fetch("/api/journey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error(`journey entry create failed: ${response.status}`);
  return response.json();
}

export async function updateJourneyEntry(id, entry) {
  const response = await fetch(`/api/journey/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) throw new Error(`journey entry update failed: ${response.status}`);
  return response.json();
}

export async function deleteJourneyEntry(id) {
  const response = await fetch(`/api/journey/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(`journey entry delete failed: ${response.status}`);
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
