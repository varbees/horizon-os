import "./env.mjs";

// Jules API client (async repository work). Server-side only; key from .env.
// Docs: https://developers.google.com/jules/api  (alpha — do not hard-depend on it)
// Auth: X-Goog-Api-Key. API keys are created in the Jules web app Settings page.

const BASE = process.env.JULES_API_BASE ?? "https://jules.googleapis.com/v1alpha";

export function julesAvailable() {
  return Boolean(process.env.JULES_API_KEY);
}

async function jules(path, { method = "GET", body, timeoutMs = 30_000 } = {}) {
  const key = process.env.JULES_API_KEY;
  if (!key) throw new Error("JULES_API_KEY not set");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-Goog-Api-Key": key,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error?.message ?? text.slice(0, 200);
    throw new Error(`jules ${res.status}: ${msg}`);
  }
  return data;
}

export async function listSources() {
  const data = await jules("/sources");
  return data.sources ?? [];
}

export async function listSessions(pageSize = 20) {
  const data = await jules(`/sessions?pageSize=${pageSize}`);
  return data.sessions ?? [];
}

export async function getSession(id) {
  return jules(`/sessions/${encodeURIComponent(id)}`);
}

export async function listActivities(id, pageSize = 30) {
  const data = await jules(`/sessions/${encodeURIComponent(id)}/activities?pageSize=${pageSize}`);
  return data.activities ?? [];
}

export async function sendMessage(id, prompt) {
  return jules(`/sessions/${encodeURIComponent(id)}:sendMessage`, { method: "POST", body: { prompt } });
}

export async function approvePlan(id) {
  return jules(`/sessions/${encodeURIComponent(id)}:approvePlan`, { method: "POST", body: {} });
}

// Create a Jules session from a Horizon runnable spec. Safe default: require plan
// approval so nothing is changed in the repo without a reviewed plan.
export async function createSession({ prompt, source, startingBranch = "main", title, requirePlanApproval = true, automationMode }) {
  if (!source) throw new Error("source required (connect the repo in Jules, then list sources)");
  const body = {
    prompt,
    title,
    requirePlanApproval,
    sourceContext: {
      source,
      githubRepoContext: { startingBranch },
    },
    ...(automationMode ? { automationMode } : {}),
  };
  return jules("/sessions", { method: "POST", body });
}
