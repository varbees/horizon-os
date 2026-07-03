export async function fetchJobPlan() {
  const res = await fetch("/api/job-plan");
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `job plan unavailable: ${res.status}`);
  return data;
}

export async function patchJobPlanState(day, patch) {
  const res = await fetch("/api/job-plan/state", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ day, patch }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(data.error || `state update failed: ${res.status}`);
  return data;
}
