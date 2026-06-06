import assert from "node:assert/strict";
import { test } from "node:test";

test("rankActions sorts active actions by priority, lane, readiness, and recency", async () => {
  const { rankActions } = await import("../scripts/ranking.mjs");
  const actions = [
    {
      id: "closed-high-priority",
      priority_score: 999,
      lane: "revenue-engine",
      state: "closed",
      updated_at: "2026-06-05T10:00:00.000Z",
    },
    {
      id: "aborted-high-priority",
      priority_score: 998,
      lane: "revenue-engine",
      state: "aborted",
      updated_at: "2026-06-05T10:00:00.000Z",
    },
    {
      id: "priority-wins",
      priority_score: 90,
      lane: "other",
      state: "captured",
      updated_at: "2026-06-05T09:00:00.000Z",
    },
    {
      id: "revenue-reviewed",
      priority_score: 50,
      lane: "revenue-engine",
      state: "reviewed",
      updated_at: "2026-06-05T08:00:00.000Z",
    },
    {
      id: "revenue-enriched",
      priority_score: 50,
      lane: "revenue-engine",
      state: "enriched",
      updated_at: "2026-06-05T09:00:00.000Z",
    },
    {
      id: "fast-deployable",
      priority_score: 50,
      lane: "fast-cash",
      state: "deployable",
      updated_at: "2026-06-05T10:00:00.000Z",
    },
    {
      id: "experiment-newer",
      priority_score: 10,
      lane: "experiment",
      state: "captured",
      updated_at: "2026-06-05T10:00:00.000Z",
    },
    {
      id: "experiment-older",
      priority_score: 10,
      lane: "experiment",
      state: "captured",
      updated_at: "2026-06-05T09:00:00.000Z",
    },
  ];

  assert.deepEqual(
    rankActions(actions).map((action) => action.id),
    [
      "priority-wins",
      "revenue-reviewed",
      "revenue-enriched",
      "fast-deployable",
      "experiment-newer",
      "experiment-older",
    ],
  );
  assert.equal(actions[0].id, "closed-high-priority", "rankActions must not mutate the input order");
});
