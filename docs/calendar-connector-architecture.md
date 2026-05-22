# Calendar Connector Architecture

## Direction

Horizon OS should behave like a command calendar first, then sync to external calendars. The app stays useful offline through ICS export, then gains native Google Calendar sync, then Microsoft Graph/Outlook sync.

## Provider Order

1. ICS export
   - Current working path.
   - No OAuth or backend needed.
   - Good for first import and fast iteration.

2. Google Calendar API
   - First native connector.
   - Use OAuth, recurring event create/update, event watch webhooks, and sync tokens.
   - Treat Horizon OS as source of truth for foundry blocks until the user explicitly edits ownership.

3. Microsoft Graph Calendar
   - Second native connector.
   - Use Microsoft identity, event create/update, recurrence support, and change notifications.
   - Add only after Google sync semantics are stable.

4. Codex Agent Bridge
   - Event context feeds agent prompts.
   - Agent can propose docs, calendar edits, outreach tasks, or git work.
   - Writes require explicit confirmation.

## Data Model

Each event needs:

- `local_id`
- `provider`
- `provider_event_id`
- `title`
- `start_at`
- `end_at`
- `timezone`
- `recurrence_rule`
- `lane`
- `output_contract`
- `source_of_truth`
- `last_synced_at`
- `sync_token`
- `agent_prompt_template`

## Sync Rules

- Never create duplicate recurring events. Store provider IDs immediately.
- ICS export is publish-only.
- Native connectors are two-way only after conflict rules exist.
- Sunday review owns schedule changes.
- Weekday edits should become proposed changes unless explicitly forced.

## Agent Rules

- Selected calendar block becomes prompt context.
- Agent must return one physical next action.
- Agent may draft but should not silently mutate docs, calendars, or git.
- Every accepted agent action should attach evidence: file path, commit hash, sent message, or logged metric.
