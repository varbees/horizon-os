import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  actionQueueSeed,
  actionTasks,
  capitalTargets,
  cashLedgerSeed,
  hackathonEvents,
  journeyEntries,
  offerPipelineSeed,
  resourceSeeds,
  runwayStateSeed,
  socialPostSeeds,
  socialSkillCatalog,
  systemEdges,
  systemNodes,
  timeBlocks,
} from "../src/data/horizon.js";

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
      evidence = excluded.evidence,
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
      task.status ?? "open",
      task.priority ?? "normal",
      Number(task.revenueImpact ?? 0),
      task.dueAt ?? null,
      task.evidence ?? "",
      Number(task.sortOrder ?? 0),
    );
  }

  const insertJourney = db.prepare(`
    INSERT INTO journey_entries (
      id, parent_id, date, tz, type, anchor, segment, title, location,
      latitude, longitude, altitude_m, accuracy_m, elevation_gain_m,
      terrain, difficulty, evidence, lesson, next_action, tags_json, sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      parent_id = excluded.parent_id,
      date = excluded.date,
      tz = excluded.tz,
      type = excluded.type,
      anchor = excluded.anchor,
      segment = excluded.segment,
      title = excluded.title,
      location = excluded.location,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      altitude_m = excluded.altitude_m,
      accuracy_m = excluded.accuracy_m,
      elevation_gain_m = excluded.elevation_gain_m,
      terrain = excluded.terrain,
      difficulty = excluded.difficulty,
      evidence = excluded.evidence,
      lesson = excluded.lesson,
      next_action = excluded.next_action,
      tags_json = excluded.tags_json,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);

  for (const entry of journeyEntries) {
    insertJourney.run(
      entry.id,
      entry.parentId ?? null,
      entry.date,
      entry.tz ?? "Asia/Kolkata",
      entry.type ?? "Field Scout",
      entry.anchor ?? "Spec",
      entry.segment ?? "ridge",
      entry.title,
      entry.location ?? "",
      entry.latitude ?? null,
      entry.longitude ?? null,
      entry.altitudeMeters ?? null,
      entry.accuracyMeters ?? null,
      entry.elevationGainMeters ?? null,
      entry.terrain ?? "",
      entry.difficulty ?? "",
      entry.evidence ?? "",
      entry.lesson ?? "",
      entry.next ?? "",
      JSON.stringify(entry.tags ?? []),
      Number(entry.sortOrder ?? 0),
    );
  }

  const insertTarget = db.prepare(`
    INSERT INTO capital_targets (id, label, target_inr, saved_inr, deadline, purpose, next_action, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      target_inr = excluded.target_inr,
      deadline = excluded.deadline,
      purpose = excluded.purpose,
      next_action = excluded.next_action,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  for (const target of capitalTargets) {
    insertTarget.run(
      target.id,
      target.label,
      Number(target.targetInr ?? 0),
      Number(target.savedInr ?? 0),
      target.deadline ?? "",
      target.purpose ?? "",
      target.next ?? "",
      Number(target.sortOrder ?? 0),
    );
  }

  const insertPipeline = db.prepare(`
    INSERT INTO offer_pipeline (id, buyer, offer, stage, value_inr, recurring, next_action, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      buyer = excluded.buyer,
      offer = excluded.offer,
      value_inr = excluded.value_inr,
      recurring = excluded.recurring,
      next_action = excluded.next_action,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  for (const offer of offerPipelineSeed) {
    insertPipeline.run(
      offer.id,
      offer.buyer ?? "",
      offer.offer ?? "",
      offer.stage ?? "prospect",
      Number(offer.valueInr ?? 0),
      Number(offer.recurring ?? 0),
      offer.next ?? "",
      Number(offer.sortOrder ?? 0),
    );
  }

  const insertLedger = db.prepare(`
    INSERT OR IGNORE INTO cash_ledger (id, date, direction, amount_inr, category, note, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of cashLedgerSeed) {
    insertLedger.run(
      row.id,
      row.date,
      row.direction ?? "in",
      Number(row.amountInr ?? 0),
      row.category ?? "general",
      row.note ?? "",
      row.source ?? "seed",
    );
  }

  db.prepare(`
    INSERT INTO runway_state (
      id, current_cash_inr, monthly_burn_inr, mrr_inr,
      weekly_outbound_target, weekly_conversation_target, weekly_offer_target, milestone_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(
    runwayStateSeed.id,
    Number(runwayStateSeed.currentCashInr ?? 0),
    Number(runwayStateSeed.monthlyBurnInr ?? 0),
    Number(runwayStateSeed.mrrInr ?? 0),
    Number(runwayStateSeed.weeklyOutboundTarget ?? 25),
    Number(runwayStateSeed.weeklyConversationTarget ?? 3),
    Number(runwayStateSeed.weeklyOfferTarget ?? 1),
    runwayStateSeed.milestoneDate ?? "2027-02-15",
  );

  const insertAction = db.prepare(`
    INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      source = excluded.source,
      project_id = excluded.project_id,
      project_path = excluded.project_path,
      agent = excluded.agent,
      prompt = excluded.prompt,
      impact = excluded.impact,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  for (const action of actionQueueSeed) {
    insertAction.run(
      action.id,
      action.title,
      action.summary ?? "",
      action.source ?? "horizon",
      action.projectId ?? "",
      action.projectPath ?? "",
      action.agent ?? "claude",
      action.prompt ?? "",
      action.status ?? "suggested",
      action.impact ?? "normal",
      Number(action.sortOrder ?? 0),
    );
  }

  const insertResource = db.prepare(`
    INSERT INTO resources (id, title, source, kind, project_id, status, note, next_action, tags_json, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      source = excluded.source,
      kind = excluded.kind,
      project_id = excluded.project_id,
      note = excluded.note,
      next_action = excluded.next_action,
      tags_json = excluded.tags_json,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  for (const resource of resourceSeeds) {
    insertResource.run(
      resource.id,
      resource.title,
      resource.source ?? "",
      resource.kind ?? "link",
      resource.projectId ?? "",
      resource.status ?? "inbox",
      resource.note ?? "",
      resource.next ?? "",
      JSON.stringify(resource.tags ?? []),
      Number(resource.sortOrder ?? 0),
    );
  }

  const insertPost = db.prepare(`
    INSERT INTO social_posts (id, platform, format, hook, body, status, skill_id, project_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      platform = excluded.platform,
      format = excluded.format,
      hook = excluded.hook,
      body = excluded.body,
      skill_id = excluded.skill_id,
      project_id = excluded.project_id,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);
  for (const post of socialPostSeeds) {
    insertPost.run(
      post.id,
      post.platform ?? "linkedin",
      post.format ?? "post",
      post.hook ?? "",
      post.body ?? "",
      post.status ?? "idea",
      post.skillId ?? "",
      post.projectId ?? "",
      Number(post.sortOrder ?? 0),
    );
  }

  const insertSkill = db.prepare(`
    INSERT INTO social_skills (id, name, version, category, trigger, path, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      version = excluded.version,
      category = excluded.category,
      trigger = excluded.trigger,
      path = excluded.path,
      sort_order = excluded.sort_order
  `);
  socialSkillCatalog.forEach((skill, index) => {
    insertSkill.run(
      skill.id,
      skill.name,
      skill.version ?? "",
      skill.category ?? "",
      skill.trigger ?? "",
      `skills/social-media/extracted/${skill.id}/SKILL.md`,
      index,
    );
  });

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
  const journeyCount = db.prepare("SELECT count(*) AS count FROM journey_entries").get().count;
  const capitalCount = db.prepare("SELECT count(*) AS count FROM capital_targets").get().count;
  const pipelineCount = db.prepare("SELECT count(*) AS count FROM offer_pipeline").get().count;
  const resourceCount = db.prepare("SELECT count(*) AS count FROM resources").get().count;
  const skillCount = db.prepare("SELECT count(*) AS count FROM social_skills").get().count;
  const actionCount = db.prepare("SELECT count(*) AS count FROM action_queue").get().count;
  console.log(JSON.stringify({ ok: true, dbPath, nodeCount, eventCount, taskCount, journeyCount, capitalCount, pipelineCount, resourceCount, skillCount, actionCount }, null, 2));
  db.close();
}
