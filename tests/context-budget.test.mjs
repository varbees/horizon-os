import assert from "node:assert/strict";
import { test } from "node:test";

test("summarizeContextBudget estimates preflight sections and flags large packets", async () => {
  const { summarizeContextBudget, estimateTokens } = await import("../scripts/context-budget.mjs");

  const packet = {
    action: { id: "a1", title: "Ship PhotoSelect payment proof", project: "photoselect" },
    hot: { path: "wiki/hot.md", snippet: "hot ".repeat(80) },
    index: { path: "wiki/index.md", snippet: "index ".repeat(120) },
    searchResults: [
      { path: "wiki/entities/PhotoSelect.md", title: "PhotoSelect", summary: "payment proof ".repeat(70) },
      { path: "wiki/concepts/Retrieval Ladder.md", title: "Retrieval Ladder", summary: "local first search ".repeat(40) },
    ],
    dispatchHistory: [{ agent: "jules", external_state: "in_progress", external_id: "session-1" }],
    trust: { loopOk: true, openDispatches: 1, horizonSelfWip: 2 },
  };

  assert.equal(estimateTokens("abcd".repeat(10)), 10);

  const summary = summarizeContextBudget(packet, { maxTokens: 200, warnAt: 0.6, failAt: 0.85 });

  assert.equal(summary.maxTokens, 200);
  assert.ok(summary.totalTokens > 0);
  assert.equal(summary.state, "fail");
  assert.ok(summary.categories.some((row) => row.name === "Relevant wiki pages"));
  assert.ok(summary.topContributors[0].tokens >= summary.topContributors.at(-1).tokens);
  assert.match(summary.recommendations.join("\n"), /Trim search results/);
});
