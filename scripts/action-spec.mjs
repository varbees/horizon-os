// Build a runnable agent spec from a rich action_queue row. The output is a
// self-contained Markdown prompt an agent (Claude Code / Codex / Jules) can
// execute in the target project without any other context.

import { redactForSpec } from "./redact.mjs";

function bullets(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n|;|·/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
}

export function buildRunnableSpec(action, { stamp = new Date().toISOString() } = {}) {
  const cwd = action.cwd || action.project_path || "";
  const constraints = bullets(action.constraints);
  const done = bullets(action.done_criteria);
  const tools = bullets(action.tools);

  const lines = [
    `# Horizon action: ${action.title}`,
    "",
    `> Deployed ${stamp} from Horizon OS. Run this in the target project with \`${action.agent || "claude"}\`.`,
    "",
    "## Context",
    `- id: ${action.id}`,
    `- project: ${action.project_id || "(unset)"}`,
    `- cwd: ${cwd || "(set the working directory)"}`,
    `- source: ${action.source || "horizon"}`,
    `- impact: ${action.impact || "normal"}`,
    "",
    "## Goal",
    action.goal || action.summary || "(define the single outcome this action must produce)",
    "",
    "## Constraints",
    ...(constraints.length ? constraints.map((c) => `- ${c}`) : ["- Local-first; no secrets in code; keep changes scoped to this task."]),
    "",
    "## Definition of done",
    ...(done.length ? done.map((d) => `- [ ] ${d}`) : ["- [ ] The goal is achieved, verified, and the result is reported."]),
    "",
    "## Tools / resources",
    ...(tools.length ? tools.map((t) => `- ${t}`) : ["- Use the project's own runbooks and test suite."]),
    "",
    "## Task prompt",
    "",
    "```",
    action.prompt || action.summary || "(no prompt provided)",
    "```",
    "",
    "## Report back",
    "End with: what shipped, the path/URL, what's left, and the single highest-leverage next action.",
    "",
  ];
  // Scrub any secret that leaked into goal/prompt/constraints before the spec is written to
  // .horizon/queue, mirrored to Obsidian, or handed to an agent.
  return redactForSpec(lines.join("\n"));
}

export function specMeta(action) {
  return {
    runnable: Boolean((action.goal || action.summary) && (action.cwd || action.project_path)),
    hasConstraints: bullets(action.constraints).length > 0,
    hasDone: bullets(action.done_criteria).length > 0,
  };
}
