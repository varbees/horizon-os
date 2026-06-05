function specPath(action) {
  if (!action?.id) throw new TypeError("handoff dispatch requires action.id");
  return `.horizon/queue/${action.id}.md`;
}

export const handoffAdapter = {
  name: "handoff",
  capability: {
    mode: "handoff",
    planGated: true,
    repoWrite: false,
  },
  dispatch(action) {
    return { externalId: specPath(action) };
  },
  poll(externalId) {
    return { state: "handoff", externalId };
  },
  reconcile(externalId) {
    return {
      result: { state: "handoff", externalId },
      workEvent: {
        kind: "executor.handoff",
        payload: { externalId },
      },
    };
  },
};
