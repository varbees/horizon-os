function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function estimateTokens(value) {
  const text = textOf(value);
  if (!text) return 0;
  return Math.ceil(Buffer.byteLength(text, "utf8") / 4);
}

function category(name, value) {
  const text = textOf(value);
  return {
    name,
    tokens: estimateTokens(text),
    chars: text.length,
  };
}

function pct(value, maxTokens) {
  if (!maxTokens) return 0;
  return Math.round((value / maxTokens) * 1000) / 10;
}

function sectionPayloads(packet) {
  return [
    ["Action row", packet?.action],
    ["Hot cache", packet?.hot],
    ["Index", packet?.index],
    ["Relevant wiki pages", packet?.searchResults ?? []],
    ["Dispatch history", packet?.dispatchHistory ?? []],
    ["Trust state", packet?.trust],
  ];
}

function recommendationsFor(categories, totalTokens, maxTokens, state) {
  const recs = [];
  const byName = new Map(categories.map((row) => [row.name, row]));
  const search = byName.get("Relevant wiki pages");
  const index = byName.get("Index");
  const hot = byName.get("Hot cache");

  if (state === "fail" || (search && search.tokens > maxTokens * 0.35)) {
    recs.push("Trim search results or lower the preflight limit before dispatch.");
  }
  if (index && index.tokens > maxTokens * 0.25) {
    recs.push("Use the index as a pointer list, not a large embedded document.");
  }
  if (hot && hot.tokens > maxTokens * 0.2) {
    recs.push("Fold stale hot-cache facts into durable pages and shorten wiki/hot.md.");
  }
  if (totalTokens > maxTokens * 0.75) {
    recs.push("Prefer linked wiki pages over pasted raw evidence for this handoff.");
  }
  if (!recs.length) recs.push("Context packet is within the configured budget.");
  return recs;
}

export function summarizeContextBudget(packet, { maxTokens = 16000, warnAt = 0.7, failAt = 0.9 } = {}) {
  const categories = sectionPayloads(packet)
    .map(([name, value]) => category(name, value))
    .filter((row) => row.tokens > 0);
  const totalTokens = categories.reduce((sum, row) => sum + row.tokens, 0);
  const ratio = maxTokens > 0 ? totalTokens / maxTokens : 0;
  const state = ratio >= failAt ? "fail" : ratio >= warnAt ? "warn" : "ok";
  const withPct = categories.map((row) => ({ ...row, percentage: pct(row.tokens, maxTokens) }));
  return {
    state,
    maxTokens,
    totalTokens,
    percentage: pct(totalTokens, maxTokens),
    categories: withPct,
    topContributors: [...withPct].sort((a, b) => b.tokens - a.tokens).slice(0, 5),
    recommendations: recommendationsFor(withPct, totalTokens, maxTokens, state),
  };
}

const isCli = process.argv[1] && process.argv[1].endsWith("context-budget.mjs");

if (isCli) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8").trim();
  const packet = body ? JSON.parse(body) : {};
  console.log(JSON.stringify(summarizeContextBudget(packet), null, 2));
}
