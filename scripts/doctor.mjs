import "./env.mjs";

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { loadSources } from "./sources.mjs";
import { trustSummary } from "./trust.mjs";
import { wikiStatus } from "./wiki.mjs";

function check(id, status, summary, action = "") {
  return { id, status, summary, ...(action ? { action } : {}) };
}

function aggregateStatus(checks) {
  if (checks.some((row) => row.status === "fail")) return "fail";
  if (checks.some((row) => row.status === "warn")) return "warn";
  return "ok";
}

function sourceRootRows(sources) {
  return sources.roots.map((root) => ({
    id: root.id,
    type: root.type,
    path: root.absPath,
    lane: root.lane,
    weight: root.weight,
    exists: existsSync(root.absPath),
  }));
}

export function horizonDoctor(db, { staleLoopMinutes = 90 } = {}) {
  const checkedAt = new Date().toISOString();
  const trust = trustSummary(db);
  const wiki = wikiStatus(db);
  const loadedSources = loadSources();
  const roots = sourceRootRows(loadedSources);
  const graphRepairs = wiki.graph?.repairs?.length ?? 0;
  const staleLoop = trust.loopAgeMinutes == null || trust.loopAgeMinutes > staleLoopMinutes;

  const checks = [
    trust.loopOk
      ? check("loop.status", staleLoop ? "warn" : "ok", `Loop last completed ${trust.loopAgeMinutes} minutes ago.`, "Run npm run horizon or npm run horizon:watch if this grows stale.")
      : check("loop.status", "fail", trust.reason ? `Loop is not healthy: ${trust.reason}.` : "Loop is not healthy.", "Run npm run horizon and inspect .horizon/loop-status.json."),
    wiki.exists
      ? check("wiki.root", "ok", `Vault root exists at ${wiki.root}.`)
      : check("wiki.root", "fail", `Vault root is missing at ${wiki.root}.`, "Run npm run wiki:sync or set HORIZON_VAULT_PATH."),
    graphRepairs
      ? check("wiki.graph", "warn", `Wiki lint has ${graphRepairs} repair items.`, "Run npm run wiki:lint and resolve Wiki Repair Plan.")
      : check("wiki.graph", "ok", "Wiki graph has no current repair items."),
    wiki.chunkCount > 0
      ? check("wiki.retrieval", "ok", `${wiki.chunkCount} chunks available via ${wiki.retrieval.current}.`)
      : check("wiki.retrieval", "warn", "No wiki chunks are indexed.", "Run npm run wiki:sync."),
    roots.length && roots.some((root) => root.exists)
      ? check("source.registry", "ok", `${roots.filter((root) => root.exists).length}/${roots.length} configured source roots exist.`)
      : check("source.registry", "fail", "No configured source roots exist.", "Repair .horizon/sources.json."),
    trust.openDispatches > 0
      ? check("dispatch.outbox", "warn", `${trust.openDispatches} dispatches are still open.`, "Run npm run horizon to reconcile pending external work.")
      : check("dispatch.outbox", "ok", "No open dispatches."),
    trust.horizonSelfWip > 2
      ? check("horizon.self_wip", "warn", `${trust.horizonSelfWip} Horizon-self actions are in flight.`, "Close Horizon-self WIP before opening new platform work.")
      : check("horizon.self_wip", "ok", `${trust.horizonSelfWip} Horizon-self actions are in flight.`),
  ];

  const status = aggregateStatus(checks);
  return {
    status,
    checkedAt,
    summary: `Horizon doctor: ${status} (${checks.filter((row) => row.status !== "ok").length} attention items)`,
    checks,
    trust,
    wiki: {
      root: wiki.root,
      exists: wiki.exists,
      rawSourceCount: wiki.rawSourceCount,
      wikiPageCount: wiki.wikiPageCount,
      chunkCount: wiki.chunkCount,
      retrieval: wiki.retrieval,
      repairs: graphRepairs,
    },
    sources: {
      path: loadedSources.path,
      roots,
    },
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = openHorizonDb();
  try {
    console.log(JSON.stringify(horizonDoctor(db), null, 2));
  } finally {
    db.close();
  }
}
