import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The "cofounder onboarding" profile: what the operator is building, the rules the
// agents must follow, the stack, and the current goals. Captured once (after the
// sweep), persisted to disk, and injected into every deploy so agents act like a
// cofounder with continuity instead of a cold assistant. Two-tier per the research:
// this is the explicit, human-authored config (separate from auto-learned memory).

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_PATH = resolve(repoRoot, ".horizon", "agent-profile.json");

const EMPTY = {
  mission: "",
  users: "",
  success: "",
  constraints: [],
  stack: { frontend: "", backend: "", data: "" },
  codingRules: [],
  currentGoals: [],
  updatedAt: null,
};

export function readProfile() {
  try {
    if (existsSync(PROFILE_PATH)) return { ...EMPTY, ...JSON.parse(readFileSync(PROFILE_PATH, "utf8")) };
  } catch {
    /* fall through */
  }
  return { ...EMPTY };
}

export function writeProfile(patch) {
  const next = { ...readProfile(), ...patch, updatedAt: new Date().toISOString() };
  try {
    mkdirSync(dirname(PROFILE_PATH), { recursive: true });
    writeFileSync(PROFILE_PATH, `${JSON.stringify(next, null, 2)}\n`);
  } catch {
    /* best-effort */
  }
  return next;
}

export function profileConfigured() {
  const p = readProfile();
  return !!(p.mission || p.currentGoals?.length || p.constraints?.length);
}

// Compact block for prompt injection. Empty when nothing has been set.
export function profileContextBlock() {
  const p = readProfile();
  if (!profileConfigured()) return "";
  const lines = ["## Operator profile (act as a cofounder with this continuity)"];
  if (p.mission) lines.push(`Mission: ${p.mission}`);
  if (p.users) lines.push(`Users: ${p.users}`);
  if (p.success) lines.push(`Success looks like: ${p.success}`);
  const stack = [p.stack?.frontend, p.stack?.backend, p.stack?.data].filter(Boolean).join(" · ");
  if (stack) lines.push(`Preferred stack: ${stack}`);
  if (p.constraints?.length) lines.push(`Constraints:\n${p.constraints.map((c) => `- ${c}`).join("\n")}`);
  if (p.codingRules?.length) lines.push(`Working rules:\n${p.codingRules.map((c) => `- ${c}`).join("\n")}`);
  if (p.currentGoals?.length) lines.push(`Current goals:\n${p.currentGoals.map((c) => `- ${c}`).join("\n")}`);
  return lines.join("\n");
}
