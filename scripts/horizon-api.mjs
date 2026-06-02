import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { openHorizonDb } from "./horizon-db.mjs";

const port = Number(process.env.HORIZON_API_PORT ?? 8787);
const db = openHorizonDb();

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:5177",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function calendarEventPayload(body) {
  const title = String(body.title ?? "").trim() || "Untitled block";
  const lane = String(body.lane ?? body.calendar_id ?? "Manual").trim() || "Manual";
  const startAt = body.start_at ?? null;
  const endAt = body.end_at ?? null;
  return {
    title,
    lane,
    time_label: body.time_label ?? (startAt && endAt ? `${startAt} - ${endAt}` : "Unscheduled"),
    start_at: startAt,
    end_at: endAt,
    all_day: Number(body.all_day ?? 0),
    calendar_id: body.calendar_id ?? lane.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: body.description ?? "",
    location: body.location ?? "",
    people_json: Array.isArray(body.people) ? JSON.stringify(body.people) : body.people_json ?? "[]",
    rrule: body.rrule ?? "",
    exdate_json: Array.isArray(body.exdate) ? JSON.stringify(body.exdate) : body.exdate_json ?? "[]",
    color: body.color ?? "#2558d8",
    status: body.status ?? "confirmed",
    recurrence_rule: body.recurrence_rule ?? (body.rrule ? `RRULE:${body.rrule}` : ""),
    output_contract: body.output_contract ?? body.output ?? "",
    provider: body.provider ?? "local",
    provider_event_id: body.provider_event_id ?? null,
    sync_state: body.sync_state ?? "local",
  };
}

function taskPayload(body) {
  return {
    node_id: body.node_id ?? null,
    event_id: body.event_id ?? null,
    project_id: body.project_id ?? "",
    phase_id: body.phase_id ?? "",
    lane: body.lane ?? "General",
    title: String(body.title ?? "").trim() || "Untitled task",
    status: body.status ?? "open",
    priority: body.priority ?? "normal",
    revenue_impact: Number(body.revenue_impact ?? 0),
    due_at: body.due_at ?? null,
    evidence: body.evidence ?? "",
    sort_order: Number(body.sort_order ?? 0),
  };
}

function journeyPayload(body) {
  return {
    parent_id: body.parent_id ?? body.parentId ?? null,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    tz: body.tz ?? "Asia/Kolkata",
    type: body.type ?? "Field Scout",
    anchor: body.anchor ?? "Spec",
    segment: body.segment ?? "ridge",
    title: String(body.title ?? "").trim() || "Untitled leg",
    location: body.location ?? "",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    altitude_m: body.altitude_m ?? body.altitudeMeters ?? null,
    accuracy_m: body.accuracy_m ?? body.accuracyMeters ?? null,
    elevation_gain_m: body.elevation_gain_m ?? body.elevationGainMeters ?? null,
    terrain: body.terrain ?? "",
    difficulty: body.difficulty ?? "",
    evidence: body.evidence ?? "",
    lesson: body.lesson ?? "",
    next_action: body.next_action ?? body.next ?? "",
    tags_json: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
    sort_order: Number(body.sort_order ?? body.sortOrder ?? 0),
  };
}

function getCommandBase() {
  return {
    nodes: all("SELECT * FROM graph_nodes ORDER BY kind, label"),
    edges: all("SELECT * FROM graph_edges ORDER BY created_at"),
    events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
    tasks: all("SELECT * FROM tasks ORDER BY sort_order, due_at, created_at DESC LIMIT 100"),
    contexts: all("SELECT id, kind, title, source, status, updated_at FROM contexts ORDER BY updated_at DESC LIMIT 50"),
    decisions: all("SELECT * FROM decisions ORDER BY created_at DESC LIMIT 25"),
  };
}

function toFtsQuery(input) {
  const cleaned = String(input ?? "")
    .replace(/[^a-zA-Z0-9_ -]/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}*`)
    .join(" OR ");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "horizon-api" });
    }

    if (req.method === "GET" && url.pathname === "/api/command-base") {
      return json(res, 200, getCommandBase());
    }

    if (req.method === "GET" && url.pathname === "/api/calendar/events") {
      return json(res, 200, {
        events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/calendar/events") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const event = calendarEventPayload(body);
      db.prepare(`
        INSERT INTO calendar_events (
          id, title, lane, time_label, start_at, end_at, all_day, calendar_id,
          description, location, people_json, rrule, exdate_json, color, status,
          recurrence_rule, output_contract, provider, provider_event_id, sync_state
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      const existing = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "calendar_event_not_found" });
      const event = calendarEventPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE calendar_events
        SET title = ?, lane = ?, time_label = ?, start_at = ?, end_at = ?, all_day = ?,
            calendar_id = ?, description = ?, location = ?, people_json = ?, rrule = ?,
            exdate_json = ?, color = ?, status = ?, recurrence_rule = ?, output_contract = ?,
            provider = ?, provider_event_id = ?, sync_state = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/journey") {
      return json(res, 200, {
        entries: all("SELECT * FROM journey_entries ORDER BY date DESC, sort_order, created_at"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/journey") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const entry = journeyPayload(body);
      db.prepare(`
        INSERT INTO journey_entries (
          id, parent_id, date, tz, type, anchor, segment, title, location,
          latitude, longitude, altitude_m, accuracy_m, elevation_gain_m,
          terrain, difficulty, evidence, lesson, next_action, tags_json, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor,
        entry.segment, entry.title, entry.location, entry.latitude, entry.longitude,
        entry.altitude_m, entry.accuracy_m, entry.elevation_gain_m, entry.terrain,
        entry.difficulty, entry.evidence, entry.lesson, entry.next_action,
        entry.tags_json, entry.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      const existing = db.prepare("SELECT * FROM journey_entries WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "journey_entry_not_found" });
      const entry = journeyPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE journey_entries
        SET parent_id = ?, date = ?, tz = ?, type = ?, anchor = ?, segment = ?, title = ?,
            location = ?, latitude = ?, longitude = ?, altitude_m = ?, accuracy_m = ?,
            elevation_gain_m = ?, terrain = ?, difficulty = ?, evidence = ?, lesson = ?,
            next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor, entry.segment,
        entry.title, entry.location, entry.latitude, entry.longitude, entry.altitude_m,
        entry.accuracy_m, entry.elevation_gain_m, entry.terrain, entry.difficulty,
        entry.evidence, entry.lesson, entry.next_action, entry.tags_json, entry.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      db.prepare("DELETE FROM journey_entries WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      return json(res, 200, {
        tasks: all("SELECT * FROM tasks ORDER BY status, sort_order, due_at, created_at DESC"),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = toFtsQuery(url.searchParams.get("q"));
      if (!query) return json(res, 200, { results: [] });
      const results = db
        .prepare(
          `SELECT id, kind, title, source, snippet(context_fts, 3, '[', ']', '...', 16) AS snippet
           FROM context_fts
           WHERE context_fts MATCH ?
           LIMIT 20`,
        )
        .all(query);
      return json(res, 200, { results });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/nodes/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/nodes/", ""));
      const body = await readJson(req);
      db.prepare("UPDATE graph_nodes SET x = ?, y = ?, updated_at = datetime('now') WHERE id = ?").run(Number(body.x), Number(body.y), id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = await readJson(req);
      const id = randomUUID();
      const task = taskPayload(body);
      db.prepare(`
        INSERT INTO tasks (
          id, node_id, event_id, project_id, phase_id, lane, title, status,
          priority, revenue_impact, due_at, evidence, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "task_not_found" });
      const task = taskPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE tasks
        SET node_id = ?, event_id = ?, project_id = ?, phase_id = ?, lane = ?, title = ?,
            status = ?, priority = ?, revenue_impact = ?, due_at = ?, evidence = ?,
            sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/context") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO contexts (id, kind, title, body, source)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kind = excluded.kind,
          title = excluded.title,
          body = excluded.body,
          source = excluded.source,
          updated_at = datetime('now')
      `).run(id, body.kind ?? "note", body.title ?? "Untitled context", body.body ?? "", body.source ?? "api");
      db.prepare("DELETE FROM context_fts WHERE id = ?").run(id);
      db.prepare("INSERT INTO context_fts (id, kind, title, body, source) VALUES (?, ?, ?, ?, ?)").run(
        id,
        body.kind ?? "note",
        body.title ?? "Untitled context",
        body.body ?? "",
        body.source ?? "api",
      );
      return json(res, 201, { ok: true, id });
    }

    return json(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`horizon-api listening on http://127.0.0.1:${port}`);
});
