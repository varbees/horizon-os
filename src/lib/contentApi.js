async function readJson(response, label) {
  const data = await response.json().catch(() => ({ ok: false }));
  if (!response.ok) throw new Error(data.error || `${label} failed: ${response.status}`);
  return data;
}

export async function fetchContentPrompts() {
  const response = await fetch("/api/content/prompts");
  return readJson(response, "content prompts");
}

export async function fetchContentBriefs() {
  const response = await fetch("/api/content/briefs");
  return readJson(response, "content briefs");
}

export async function fetchContentBrief(id) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}`);
  return readJson(response, "content brief");
}

export async function createContentBrief(brief) {
  const response = await fetch("/api/content/briefs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(brief),
  });
  return readJson(response, "content brief create");
}

export async function runContentLane(id, body) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return readJson(response, "content lane run");
}

export async function addContentAsset(id, asset) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/assets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(asset ?? {}),
  });
  return readJson(response, "content asset");
}

export async function assembleContentPackage(id, body) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/package`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return readJson(response, "content package");
}

export async function markContentPublished(id, body) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return readJson(response, "content publish");
}

// Advance a brief by one native Claude Code lane (research -> editorial package), persisting the
// result. Same path the autonomous loop uses, so manual and hands-off produce identical drafts.
export async function advanceContentBrief(id) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/advance`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  return readJson(response, "content advance");
}

// Opt a brief in/out of the autonomous loop (the loop advances automate=1 briefs on its own).
export async function setContentAutomate(id, automate) {
  const response = await fetch(`/api/content/briefs/${encodeURIComponent(id)}/automate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ automate }),
  });
  return readJson(response, "content automate");
}
