import assert from "node:assert/strict";
import { test } from "node:test";

test("registry can register, get, and list executor adapters", async () => {
  const { get, list, register } = await import("../scripts/executors/registry.mjs");
  const adapter = {
    name: "unit-test",
    capability: { mode: "programmatic", planGated: true, repoWrite: false },
    dispatch() {
      return { externalId: "unit-external" };
    },
    poll() {
      return { state: "done" };
    },
    reconcile() {
      return { result: { state: "done" }, workEvent: { kind: "unit.done" } };
    },
  };

  assert.equal(register(adapter), adapter);
  assert.equal(get("unit-test"), adapter);
  assert.ok(list().some((item) => item.name === "unit-test"));
});

test("handoff adapter reports handoff mode and returns the queue spec path", async () => {
  const { handoffAdapter } = await import("../scripts/executors/handoff.mjs");

  assert.equal(handoffAdapter.name, "handoff");
  assert.equal(handoffAdapter.capability.mode, "handoff");
  assert.equal(handoffAdapter.capability.planGated, true);
  assert.deepEqual(handoffAdapter.dispatch({ id: "action-123" }), {
    externalId: ".horizon/queue/action-123.md",
  });
});
