import "./env.mjs";

import { openHorizonDb } from "./horizon-db.mjs";
import { searchWiki } from "./wiki.mjs";

export const DEFAULT_RETRIEVAL_CASES = [
  {
    id: "llm-wiki-pattern",
    query: "Karpathy LLM wiki pattern persistent wiki",
    expectedPaths: ["wiki/concepts/LLM Wiki Pattern.md", "wiki/sources/Karpathy LLM Wiki Pattern.md"],
  },
  {
    id: "turbovec-adapter",
    query: "turbovec local vector adapter stable ids allowlist",
    expectedPaths: ["wiki/entities/turbovec.md", "wiki/sources/turbovec.md"],
  },
  {
    id: "dispatch-memory",
    query: "Jules dispatch outbox reconcile work events",
    expectedPaths: ["wiki/domains/Dispatch Memory.md"],
  },
];

function normalizedSet(values) {
  return new Set((values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean));
}

export function evaluateWikiRetrieval(db, cases = DEFAULT_RETRIEVAL_CASES, { limit = 5 } = {}) {
  const rows = cases.map((testCase) => {
    const results = searchWiki(db, testCase.query, { limit });
    const foundPaths = results.map((result) => result.path);
    const expected = normalizedSet(testCase.expectedPaths);
    const matches = foundPaths.filter((path) => expected.has(path));
    const pass = expected.size === 0 ? foundPaths.length > 0 : matches.length > 0;
    return {
      id: testCase.id ?? testCase.query,
      query: testCase.query,
      expectedPaths: [...expected],
      foundPaths,
      matchedPaths: matches,
      pass,
      topScore: results[0]?.score ?? 0,
      topPath: results[0]?.path ?? "",
    };
  });

  const failed = rows.filter((row) => !row.pass).length;
  return {
    ok: failed === 0,
    strategy: "hot-index-chunk-bm25-lite",
    total: rows.length,
    passed: rows.length - failed,
    failed,
    needsVectorAdapter: failed > 0,
    cases: rows,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openHorizonDb();
  try {
    const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
    const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : 5;
    console.log(JSON.stringify(evaluateWikiRetrieval(db, DEFAULT_RETRIEVAL_CASES, { limit }), null, 2));
  } finally {
    db.close();
  }
}
