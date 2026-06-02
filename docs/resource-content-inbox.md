# Resource and Content Inbox (v0.6)

The `/inbox` screen captures links, files, research, and ideas before they get lost, tags them to a
project, and advances them to a concrete next action. It also runs the build-in-public loop: every
shipped slice becomes a social artifact, drafted with the social-media skills pack.

## Three surfaces

1. **Resources** - capture (title + URL/path), kind, project tag, and a status that cycles
   `inbox -> assigned -> actioned -> archived`. Seeded with the now-ingested assets (skills pack,
   income plan, AshishBuilds research, PlantSage corpus, Hariharakhona landing).
2. **Content backlog** - social posts with platform, format, hook, status
   (`idea -> draft -> scheduled -> published`), and the skill that should write them. Seeded with
   three build-in-public drafts (Capital OS teardown, trek-ledger thread, PhotoSelect proof).
3. **Skill catalog** - the 14 skills from `social-media-skills-v1.3.0.zip`, extracted to
   `skills/social-media/extracted/` and grouped Strategy / Create / Analyze.

## Data model

Three tables in `db/schema.sql`, seeded from `src/data/horizon.js`:

- `resources` (title, source, kind, project_id, status, note, next_action, tags)
- `social_posts` (platform, format, hook, body, status, skill_id, project_id)
- `social_skills` (name, version, category, trigger, path) - the catalog

API: `GET /api/inbox` composite; `POST/PATCH/DELETE /api/resources`;
`POST/PATCH/DELETE /api/social-posts`. The screen renders from live rows or static seeds and updates
optimistically so it stays usable when the API is offline.

## The build-in-public loop

Per the founder playbook: ship a slice, capture it as a resource, draft one post with the matching
Create skill, advance it to published, and record the response at the Sunday review. Start by running
`social-media-context-sms` once to set voice and audience, then pull one Create skill per ship.

## Exit gate

- `npm run db:init` seeds resources and the skill catalog (`resourceCount` / `skillCount`).
- `npm run build` passes.
- A resource can be captured, tagged to a project, and advanced to a next action.
