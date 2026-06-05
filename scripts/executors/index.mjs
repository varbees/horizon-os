// Single import point that populates the executor registry. Adding a new agent = write one
// audited adapter module and register it here — the core loop never changes.

import { register, get, list } from "./registry.mjs";
import { julesAdapter } from "./jules.mjs";
import { handoffAdapter } from "./handoff.mjs";

register(julesAdapter);
register(handoffAdapter);

export { get, list, register };
