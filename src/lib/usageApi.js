export async function fetchUsage({ refresh = false } = {}) {
  const response = await fetch(`/api/usage${refresh ? "?refresh=1" : ""}`);
  if (!response.ok) throw new Error(`usage unavailable: ${response.status}`);
  return response.json();
}
