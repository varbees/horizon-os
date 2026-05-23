import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { actionTasks, hackathonEvents, systemEdges, systemNodes, timeBlocks } from "../src/data/horizon.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.HORIZON_DB_PATH ?? resolve(root, ".horizon", "horizon.sqlite");
const schemaPath = resolve(root, "db", "schema.sql");

export function openHorizonDb() {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(readFileSync(schemaPath, "utf8"));
  ensureCalendarColumns(db);
  ensureTaskColumns(db);
  seed(db);
  return db;
}

function ensureCalendarColumns(db) {
  const existingColumns = new Set(db.prepare("PRAGMA table_info(calendar_events)").all().map((column) => column.name));
  const columns = [
    ["start_at", "TEXT"],
    ["end_at", "TEXT"],
    ["all_day", "INTEGER NOT NULL DEFAULT 0"],
    ["calendar_id", "TEXT NOT NULL DEFAULT 'foundry'"],
    ["description", "TEXT NOT NULL DEFAULT ''"],
    ["location", "TEXT NOT NULL DEFAULT ''"],
    ["people_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["rrule", "TEXT NOT NULL DEFAULT ''"],
    ["exdate_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["color", "TEXT NOT NULL DEFAULT '#2558d8'"],
    ["status", "TEXT NOT NULL DEFAULT 'confirmed'"],
  ];

  for (const [name, definition] of columns) {
    if (!existingColumns.has(name)) {
      db.exec(`ALTER TABLE calendar_events ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON calendar_events(calendar_id)");
}

function ensureTaskColumns(db) {
  const existingColumns = new Set(db.prepare("PRAGMA table_info(tasks)").all().map((column) => column.name));
  const columns = [
    ["project_id", "TEXT NOT NULL DEFAULT ''"],
    ["phase_id", "TEXT NOT NULL DEFAULT ''"],
    ["lane", "TEXT NOT NULL DEFAULT 'General'"],
    ["sort_order", "INTEGER NOT NULL DEFAULT 0"],
  ];

  for (const [name, definition] of columns) {
    if (!existingColumns.has(name)) {
      db.exec(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`);
    }
  }

  db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id)");
}

function parseTimeRange(timeLabel) {
  const match = timeLabel.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  if (!match) return { start: "09:00", end: "10:00" };
  return {
    start: `${match[1]}:${match[2]}`,
    end: `${match[3]}:${match[4]}`,
  };
}

function anchorDateForBlock(block) {
  if (block.calendar.includes("BYDAY=SA") || block.time.startsWith("Sat")) return "2026-05-30";
  if (block.calendar.includes("BYDAY=SU") || block.days === "Sunday") return "2026-05-31";
  return "2026-05-25";
}

function calendarIdForLane(lane) {
  return String(lane ?? "foundry").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "foundry";
}

function normalizeRrule(rule) {
  return String(rule ?? "").replace(/^RRULE:/, "");
}

function recurrenceWithHorizon(rule) {
  const normalized = normalizeRrule(rule);
  if (!normalized || /(?:^|;)COUNT=|(?:^|;)UNTIL=/.test(normalized)) return normalized;
  if (normalized.includes("FREQ=DAILY")) return `${normalized};COUNT=730`;
  if (normalized.includes("BYDAY=MO,TU,WE,TH,FR")) return `${normalized};COUNT=520`;
  return `${normalized};COUNT=104`;
}

function seed(db) {
  const insertNode = db.prepare(`
    INSERT INTO graph_nodes (id, label, kind, status, x, y, color, note, next_action, outputs_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      kind = excluded.kind,
      status = excluded.status,
      color = excluded.color,
      note = excluded.note,
      next_action = excluded.next_action,
      outputs_json = excluded.outputs_json,
      updated_at = datetime('now')
  `);

  for (const node of systemNodes) {
    insertNode.run(
      node.id,
      node.label,
      node.kind,
      node.status,
      node.x,
      node.y,
      node.color,
      node.note,
      node.next,
      JSON.stringify(node.outputs ?? []),
    );
  }

  const insertEdge = db.prepare(`
    INSERT OR IGNORE INTO graph_edges (id, from_node_id, to_node_id, label)
    VALUES (?, ?, ?, ?)
  `);

  for (const edge of systemEdges) {
    insertEdge.run(`${edge.from}->${edge.to}`, edge.from, edge.to, edge.label);
  }

  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (
      id, title, lane, time_label, start_at, end_at, calendar_id, description,
      rrule, recurrence_rule, output_contract, color, status, sync_state
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      lane = excluded.lane,
      time_label = excluded.time_label,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      calendar_id = excluded.calendar_id,
      description = excluded.description,
      rrule = excluded.rrule,
      recurrence_rule = excluded.recurrence_rule,
      output_contract = excluded.output_contract,
      color = excluded.color,
      status = excluded.status,
      sync_state = excluded.sync_state,
      updated_at = datetime('now')
  `);

  for (const block of timeBlocks) {
    const date = anchorDateForBlock(block);
    const { start, end } = parseTimeRange(block.time);
    const rrule = recurrenceWithHorizon(block.calendar);
    insertEvent.run(
      block.id,
      block.title,
      block.lane,
      block.time,
      `${date}T${start}:00+05:30[Asia/Kolkata]`,
      `${date}T${end}:00+05:30[Asia/Kolkata]`,
      calendarIdForLane(block.lane),
      block.activity,
      rrule,
      rrule ? `RRULE:${rrule}` : "",
      block.output,
      block.color,
      "confirmed",
      "seeded",
    );
  }

  for (const event of hackathonEvents) {
    const { start, end } = parseTimeRange(event.time);
    insertEvent.run(
      event.id,
      event.title,
      event.lane,
      event.time,
      `${event.date}T${start}:00+05:30[Asia/Kolkata]`,
      `${event.date}T${end}:00+05:30[Asia/Kolkata]`,
      calendarIdForLane(event.lane),
      event.activity,
      "",
      "",
      event.output,
      event.color,
      "confirmed",
      "seeded",
    );
  }

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, node_id, event_id, project_id, phase_id, lane, title, status,
      priority, revenue_impact, due_at, evidence, sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      node_id = excluded.node_id,
      event_id = excluded.event_id,
      project_id = excluded.project_id,
      phase_id = excluded.phase_id,
      lane = excluded.lane,
      title = excluded.title,
      priority = excluded.priority,
      revenue_impact = excluded.revenue_impact,
      due_at = excluded.due_at,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);

  for (const task of actionTasks) {
    insertTask.run(
      task.id,
      task.nodeId ?? null,
      task.eventId ?? null,
      task.projectId ?? "",
      task.phaseId ?? "",
      task.lane ?? "General",
      task.title,
      "open",
      task.priority ?? "normal",
      Number(task.revenueImpact ?? 0),
      task.dueAt ?? null,
      task.evidence ?? "",
      Number(task.sortOrder ?? 0),
    );
  }

  const insertContext = db.prepare(`
    INSERT OR IGNORE INTO contexts (id, kind, title, body, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertContext.run(
    "foundry-objective",
    "mission",
    "Antharmaya foundry objective",
    "Service floor first, PhotoSelect flagship, Horizon OS command base, safe-haven backbone.",
    "seed",
  );

  for (const node of systemNodes) {
    insertContext.run(
      `node-${node.id}`,
      "graph_node",
      node.label,
      `${node.note}\nNext: ${node.next}\nOutputs: ${(node.outputs ?? []).join(", ")}`,
      "seed",
    );
  }

  db.exec("DELETE FROM context_fts");
  db.exec(`
    INSERT INTO context_fts (id, kind, title, body, source)
    SELECT id, kind, title, body, source FROM contexts
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openHorizonDb();
  const nodeCount = db.prepare("SELECT count(*) AS count FROM graph_nodes").get().count;
  const eventCount = db.prepare("SELECT count(*) AS count FROM calendar_events").get().count;
  const taskCount = db.prepare("SELECT count(*) AS count FROM tasks").get().count;
  console.log(JSON.stringify({ ok: true, dbPath, nodeCount, eventCount, taskCount }, null, 2));
  db.close();
}
