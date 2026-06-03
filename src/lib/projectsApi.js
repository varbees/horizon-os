export async function fetchProjects() {
  const response = await fetch("/api/projects");
  if (!response.ok) throw new Error(`projects unavailable: ${response.status}`);
  return response.json();
}

export async function runProjectSweep() {
  const response = await fetch("/api/projects/sweep", { method: "POST" });
  if (!response.ok) throw new Error(`project sweep failed: ${response.status}`);
  return response.json();
}
