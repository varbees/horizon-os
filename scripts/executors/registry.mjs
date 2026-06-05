const modes = new Set(["programmatic", "handoff"]);
const registry = new Map();

function requireFunction(adapter, field) {
  if (typeof adapter[field] !== "function") {
    throw new TypeError(`executor adapter ${adapter.name ?? "(unnamed)"} missing ${field}()`);
  }
}

function validate(adapter) {
  if (!adapter || typeof adapter !== "object") throw new TypeError("executor adapter must be an object");
  if (!adapter.name || typeof adapter.name !== "string") throw new TypeError("executor adapter requires a string name");
  if (!adapter.capability || typeof adapter.capability !== "object") {
    throw new TypeError(`executor adapter ${adapter.name} requires capability`);
  }
  if (!modes.has(adapter.capability.mode)) {
    throw new TypeError(`executor adapter ${adapter.name} has invalid mode`);
  }
  if (typeof adapter.capability.planGated !== "boolean") {
    throw new TypeError(`executor adapter ${adapter.name} capability.planGated must be boolean`);
  }
  if (typeof adapter.capability.repoWrite !== "boolean") {
    throw new TypeError(`executor adapter ${adapter.name} capability.repoWrite must be boolean`);
  }
  requireFunction(adapter, "dispatch");
  requireFunction(adapter, "poll");
  requireFunction(adapter, "reconcile");
}

export function register(adapter) {
  validate(adapter);
  registry.set(adapter.name, adapter);
  return adapter;
}

export function get(name) {
  return registry.get(name);
}

export function list() {
  return [...registry.values()];
}
