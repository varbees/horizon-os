import "./env.mjs";

// Claude/agent usage summary from ccusage (reads ~/.claude session logs).
// Spawns `npx ccusage daily --json`, parses, and computes a compact summary.
// Cached in memory because the spawn takes a few seconds.

import { execFile } from "node:child_process";

let cache = { at: 0, data: null };
let refreshing = null;
const TTL_MS = 5 * 60 * 1000;

// bunx first (fast, no registry roundtrip when cached), npx as fallback.
// `ccusage@latest` over npx was observed hanging on registry fetches, which
// blocked /api/usage indefinitely — hence hard 25s timeouts per runner.
const RUNNERS = [
  ["bunx", ["ccusage", "daily", "--json"]],
  ["npx", ["-y", "ccusage", "daily", "--json"]],
];

function runWith(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 25_000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(error);
      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

async function runCcusage() {
  let lastError;
  for (const [cmd, args] of RUNNERS) {
    try {
      return await runWith(cmd, args);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("ccusage unavailable");
}

function cacheHit(row) {
  const read = Number(row.cacheReadTokens ?? 0);
  const create = Number(row.cacheCreationTokens ?? 0);
  const input = Number(row.inputTokens ?? 0);
  const denom = read + create + input;
  return denom > 0 ? read / denom : 0;
}

function sumScope(rows) {
  const acc = { totalTokens: 0, totalCost: 0, cacheReadTokens: 0, cacheCreationTokens: 0, inputTokens: 0, outputTokens: 0 };
  for (const r of rows) {
    acc.totalTokens += Number(r.totalTokens ?? 0);
    acc.totalCost += Number(r.totalCost ?? 0);
    acc.cacheReadTokens += Number(r.cacheReadTokens ?? 0);
    acc.cacheCreationTokens += Number(r.cacheCreationTokens ?? 0);
    acc.inputTokens += Number(r.inputTokens ?? 0);
    acc.outputTokens += Number(r.outputTokens ?? 0);
  }
  acc.cacheHit = cacheHit(acc);
  return acc;
}

function buildSummary(raw) {
  const daily = Array.isArray(raw.daily) ? raw.daily : [];
  const sorted = [...daily].sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const today = new Date().toISOString().slice(0, 10);
  const last7 = sorted.slice(-7);
  const todayRow = sorted.find((r) => r.period === today) ?? sorted[sorted.length - 1] ?? null;

  // model mix over last 7 days
  const modelTokens = new Map();
  for (const r of last7) {
    for (const m of r.modelBreakdowns ?? []) {
      const tokens = Number(m.inputTokens ?? 0) + Number(m.outputTokens ?? 0) + Number(m.cacheReadTokens ?? 0) + Number(m.cacheCreationTokens ?? 0);
      modelTokens.set(m.modelName, (modelTokens.get(m.modelName) ?? 0) + tokens);
    }
  }
  const modelTotal = [...modelTokens.values()].reduce((s, v) => s + v, 0) || 1;
  const modelMix = [...modelTokens.entries()]
    .map(([model, tokens]) => ({ model, tokens, pct: Math.round((tokens / modelTotal) * 100) }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  return {
    available: true,
    today: todayRow
      ? { date: todayRow.period, tokens: Number(todayRow.totalTokens ?? 0), cost: Number(todayRow.totalCost ?? 0), cacheHit: cacheHit(todayRow) }
      : null,
    week: sumScope(last7),
    total: {
      totalTokens: Number(raw.totals?.totalTokens ?? 0),
      totalCost: Number(raw.totals?.totalCost ?? 0),
      cacheHit: cacheHit(raw.totals ?? {}),
    },
    last7: last7.map((r) => ({ date: r.period, tokens: Number(r.totalTokens ?? 0), cost: Number(r.totalCost ?? 0) })),
    modelMix,
    days: sorted.length,
  };
}

function refreshInBackground() {
  if (refreshing) return refreshing;
  refreshing = runCcusage()
    .then((raw) => {
      cache = { at: Date.now(), data: buildSummary(raw) };
    })
    .catch((error) => {
      cache = { at: Date.now(), data: { available: false, error: String(error.message ?? error) } };
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Never blocks the caller: serves cached data (even stale) instantly and
// refreshes in the background. First-ever call returns a pending marker.
export async function getUsageSummary({ force = false } = {}) {
  const fresh = cache.data && Date.now() - cache.at < TTL_MS;
  if (!fresh || force) void refreshInBackground();
  if (cache.data) return { ...cache.data, stale: !fresh };
  return { available: false, pending: true };
}
