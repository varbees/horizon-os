const laneRank = new Map([
  ["revenue-engine", 0],
  ["fast-cash", 1],
  ["experiment", 2],
]);

const stateRank = new Map([
  ["deployable", 0],
  ["reviewed", 1],
  ["enriched", 2],
  ["captured", 3],
]);

const inactiveStates = new Set(["closed", "aborted"]);

function numberValue(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function rankFrom(map, value, fallback) {
  return map.get(String(value ?? "")) ?? fallback;
}

function updatedMs(action) {
  const ms = Date.parse(action?.updated_at ?? "");
  return Number.isFinite(ms) ? ms : 0;
}

export function rankActions(actions) {
  return [...(actions ?? [])]
    .filter((action) => !inactiveStates.has(String(action?.state ?? "")))
    .sort((a, b) => {
      const priority = numberValue(b.priority_score) - numberValue(a.priority_score);
      if (priority) return priority;

      const lane = rankFrom(laneRank, a.lane, 3) - rankFrom(laneRank, b.lane, 3);
      if (lane) return lane;

      const state = rankFrom(stateRank, a.state, 4) - rankFrom(stateRank, b.state, 4);
      if (state) return state;

      return updatedMs(b) - updatedMs(a);
    });
}
