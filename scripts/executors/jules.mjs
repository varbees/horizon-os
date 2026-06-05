import { createSession, getSession } from "../jules.mjs";

// Jules executor adapter (programmatic, plan-gated, repo-writing). Jules v1alpha has no
// webhooks, so completion is discovered by polling GetSession — hence the reconcile pass.
// The 9 documented session states collapse to Horizon's lifecycle vocabulary.

export const JULES_STATE_MAP = {
  STATE_UNSPECIFIED: "in_progress",
  QUEUED: "in_progress",
  PLANNING: "in_progress",
  AWAITING_PLAN_APPROVAL: "awaiting_plan", // surface to operator for :approvePlan
  AWAITING_USER_FEEDBACK: "blocked", // surface for :sendMessage
  IN_PROGRESS: "in_progress",
  PAUSED: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
};

export function mapJulesState(state) {
  return JULES_STATE_MAP[state] ?? "in_progress";
}

export function pullRequestUrl(session) {
  return (session?.outputs ?? []).map((o) => o?.pullRequest?.url).find(Boolean) ?? "";
}

export const julesAdapter = {
  name: "jules",
  capability: { mode: "programmatic", planGated: true, repoWrite: true },
  async dispatch(action) {
    const session = await createSession({
      prompt: action.prompt,
      source: action.source,
      startingBranch: action.startingBranch ?? "main",
      title: action.title,
      requirePlanApproval: action.requirePlanApproval !== false,
      automationMode: action.automationMode,
    });
    return { externalId: session.id ?? session.name ?? "" };
  },
  async poll(externalId) {
    const session = await getSession(externalId);
    return { state: mapJulesState(session.state), externalId, raw: session };
  },
  async reconcile(externalId) {
    const session = await getSession(externalId);
    const state = mapJulesState(session.state);
    return {
      result: { state, resultUrl: pullRequestUrl(session) },
      workEvent: { kind: "executor.jules", payload: { externalId, state, resultUrl: pullRequestUrl(session) } },
    };
  },
};
