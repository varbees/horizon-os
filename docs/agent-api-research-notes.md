# Agent API Research Notes

Scope: Google Jules API, Gemini API keys, Google ADK, and Claude agent-loop hooks.

## Jules API

Source: <https://developers.google.com/jules/api>

Notes for Horizon:

- Jules is useful for async repository work, not browser UI.
- The API is alpha, so do not make it a hard dependency for the command center.
- Auth uses the `X-Goog-Api-Key` request header.
- Core resources are:
  - Source: connected repo, usually through the Jules GitHub app.
  - Session: a continuous unit of work from a prompt and source.
  - Activity: timeline events inside a session.
- Horizon should create task prompts and expected outputs first, then send only clear repo work to Jules.

## Gemini API Keys

Source: <https://ai.google.dev/gemini-api/docs/api-key>

Notes for Horizon:

- Node-side workers can read `GEMINI_API_KEY` from `.env` through `scripts/env.mjs`.
- Browser code must never receive or embed the key.
- Restrict the key to the Gemini/Generative Language API in Google Cloud Console when possible.
- Use Gemini for cheap first-pass workers: signal summarization, action ranking, note drafting, and offer variants.

## Google ADK

Source: <https://adk.dev/>

Notes for Horizon:

- ADK is useful when a workflow becomes a real multi-step worker, not for one-off prompts.
- It supports Python, TypeScript, Go, Java, and Kotlin.
- Graph workflows are the relevant feature for Horizon because they combine deterministic steps with AI reasoning.
- First good Horizon worker: read project sweep + signals + action queue from SQLite, rank money relevance, write deployable actions back.

## Claude Agent Hooks

Source: <https://code.claude.com/docs/en/agent-sdk/agent-loop>

Notes for Horizon:

- Hooks can run outside the context window and enforce behavior without wasting prompt tokens.
- Useful events include `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, and `PreCompact`.
- Horizon should use this pattern conceptually: validate risky work before execution, record results after execution, and archive context before compaction.
- Do not import external Claude/OpenClaw repos into the project index. Use ideas, not vendor code.
