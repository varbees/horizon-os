PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'local',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS context_fts USING fts5(
  id UNINDEXED,
  kind,
  title,
  body,
  source
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#f5efe4',
  note TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  outputs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  weight REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lane TEXT NOT NULL,
  time_label TEXT NOT NULL,
  start_at TEXT,
  end_at TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  calendar_id TEXT NOT NULL DEFAULT 'foundry',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  people_json TEXT NOT NULL DEFAULT '[]',
  rrule TEXT NOT NULL DEFAULT '',
  exdate_json TEXT NOT NULL DEFAULT '[]',
  color TEXT NOT NULL DEFAULT '#2558d8',
  status TEXT NOT NULL DEFAULT 'confirmed',
  recurrence_rule TEXT NOT NULL DEFAULT '',
  output_contract TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'local',
  provider_event_id TEXT,
  sync_state TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  node_id TEXT REFERENCES graph_nodes(id) ON DELETE SET NULL,
  event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL,
  project_id TEXT NOT NULL DEFAULT '',
  phase_id TEXT NOT NULL DEFAULT '',
  lane TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  revenue_impact INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  evidence TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  node_id TEXT REFERENCES graph_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journey_entries (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES journey_entries(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  tz TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  type TEXT NOT NULL DEFAULT 'Field Scout',
  anchor TEXT NOT NULL DEFAULT 'Spec',
  segment TEXT NOT NULL DEFAULT 'ridge',
  title TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  altitude_m REAL,
  accuracy_m REAL,
  elevation_gain_m REAL,
  terrain TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  lesson TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS capital_targets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  target_inr INTEGER NOT NULL DEFAULT 0,
  saved_inr INTEGER NOT NULL DEFAULT 0,
  deadline TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cash_ledger (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'in',
  amount_inr INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offer_pipeline (
  id TEXT PRIMARY KEY,
  buyer TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'prospect',
  value_inr INTEGER NOT NULL DEFAULT 0,
  recurring INTEGER NOT NULL DEFAULT 0,
  next_action TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS runway_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  current_cash_inr INTEGER NOT NULL DEFAULT 0,
  monthly_burn_inr INTEGER NOT NULL DEFAULT 0,
  mrr_inr INTEGER NOT NULL DEFAULT 0,
  weekly_outbound_target INTEGER NOT NULL DEFAULT 25,
  weekly_conversation_target INTEGER NOT NULL DEFAULT 3,
  weekly_offer_target INTEGER NOT NULL DEFAULT 1,
  milestone_date TEXT NOT NULL DEFAULT '2027-02-15',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'link',
  project_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'inbox',
  note TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL DEFAULT 'linkedin',
  format TEXT NOT NULL DEFAULT 'post',
  hook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idea',
  skill_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  scheduled_for TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS social_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  trigger TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS action_queue (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'horizon',
  project_id TEXT NOT NULL DEFAULT '',
  project_path TEXT NOT NULL DEFAULT '',
  agent TEXT NOT NULL DEFAULT 'claude',
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'suggested',
  impact TEXT NOT NULL DEFAULT 'normal',
  deployed_path TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vectors (
  id TEXT PRIMARY KEY,
  context_id TEXT REFERENCES contexts(id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'manual',
  dimensions INTEGER NOT NULL DEFAULT 0,
  vector_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS command_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT 'codex',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_node ON tasks(node_id);
CREATE INDEX IF NOT EXISTS idx_contexts_kind ON contexts(kind);
CREATE INDEX IF NOT EXISTS idx_vectors_context ON vectors(context_id);
CREATE INDEX IF NOT EXISTS idx_journey_parent ON journey_entries(parent_id);
CREATE INDEX IF NOT EXISTS idx_journey_anchor ON journey_entries(anchor);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_date ON cash_ledger(date);
CREATE INDEX IF NOT EXISTS idx_offer_pipeline_stage ON offer_pipeline(stage);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_skills_category ON social_skills(category);
CREATE INDEX IF NOT EXISTS idx_action_queue_status ON action_queue(status);
CREATE INDEX IF NOT EXISTS idx_action_queue_project ON action_queue(project_id);
