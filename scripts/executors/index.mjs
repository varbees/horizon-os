// Single import point that populates the executor registry. Adding a new agent = write one
// audited adapter module and register it here — the core loop never changes.

import { register, get, list } from "./registry.mjs";
import { julesAdapter } from "./jules.mjs";
import { handoffAdapter } from "./handoff.mjs";
import { claudeCodeAdapter } from "./claude-code.mjs";
import { codexAdapter } from "./codex.mjs";

register(julesAdapter);
register(handoffAdapter);
register(claudeCodeAdapter);
register(codexAdapter);

export { get, list, register };
