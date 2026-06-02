import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { fetchFeed } from "./rss.mjs";

const port = Number(process.env.HORIZON_API_PORT ?? 8787);
const db = openHorizonDb();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const queueDir = resolve(repoRoot, ".horizon", "queue");

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

    if (req.method === "GET" && url.pathname === "/api/capital") {
      return json(res, 200, {
        targets: all("SELECT * FROM capital_targets ORDER BY sort_order, label"),
        ledger: all("SELECT * FROM cash_ledger ORDER BY date DESC, created_at DESC LIMIT 200"),
        pipeline: all("SELECT * FROM offer_pipeline ORDER BY sort_order, updated_at DESC"),
        runway: db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? null,
      });
    }

    if (req.method === "PATCH" && url.pathname === "/api/capital/runway") {
      const body = await readJson(req);
      const existing = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
      const next = {
        current_cash_inr: Number(body.current_cash_inr ?? body.currentCashInr ?? existing.current_cash_inr ?? 0),
        monthly_burn_inr: Number(body.monthly_burn_inr ?? body.monthlyBurnInr ?? existing.monthly_burn_inr ?? 0),
        mrr_inr: Number(body.mrr_inr ?? body.mrrInr ?? existing.mrr_inr ?? 0),
        weekly_outbound_target: Number(body.weekly_outbound_target ?? existing.weekly_outbound_target ?? 25),
        weekly_conversation_target: Number(body.weekly_conversation_target ?? existing.weekly_conversation_target ?? 3),
        weekly_offer_target: Number(body.weekly_offer_target ?? existing.weekly_offer_target ?? 1),
        milestone_date: body.milestone_date ?? existing.milestone_date ?? "2027-02-15",
      };
      db.prepare(`
        INSERT INTO runway_state (id, current_cash_inr, monthly_burn_inr, mrr_inr,
          weekly_outbound_target, weekly_conversation_target, weekly_offer_target, milestone_date, updated_at)
        VALUES ('current', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          current_cash_inr = excluded.current_cash_inr,
          monthly_burn_inr = excluded.monthly_burn_inr,
          mrr_inr = excluded.mrr_inr,
          weekly_outbound_target = excluded.weekly_outbound_target,
          weekly_conversation_target = excluded.weekly_conversation_target,
          weekly_offer_target = excluded.weekly_offer_target,
          milestone_date = excluded.milestone_date,
          updated_at = datetime('now')
      `).run(
        next.current_cash_inr, next.monthly_burn_inr, next.mrr_inr,
        next.weekly_outbound_target, next.weekly_conversation_target,
        next.weekly_offer_target, next.milestone_date,
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/targets/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/targets/", ""));
      const existing = db.prepare("SELECT * FROM capital_targets WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "target_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE capital_targets SET saved_inr = ?, next_action = ?, updated_at = datetime('now') WHERE id = ?").run(
        Number(body.saved_inr ?? body.savedInr ?? existing.saved_inr),
        body.next_action ?? body.next ?? existing.next_action,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/ledger") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO cash_ledger (id, date, direction, amount_inr, category, note, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.date ?? new Date().toISOString().slice(0, 10),
        body.direction === "out" ? "out" : "in",
        Number(body.amount_inr ?? body.amountInr ?? 0),
        body.category ?? "general",
        body.note ?? "",
        body.source ?? "manual",
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/ledger/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/ledger/", ""));
      db.prepare("DELETE FROM cash_ledger WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/pipeline") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO offer_pipeline (id, buyer, offer, stage, value_inr, recurring, next_action, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.buyer ?? "",
        body.offer ?? "",
        body.stage ?? "prospect",
        Number(body.value_inr ?? body.valueInr ?? 0),
        Number(body.recurring ?? 0),
        body.next_action ?? body.next ?? "",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      const existing = db.prepare("SELECT * FROM offer_pipeline WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "offer_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE offer_pipeline SET buyer = ?, offer = ?, stage = ?, value_inr = ?, recurring = ?,
          next_action = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.buyer ?? existing.buyer,
        body.offer ?? existing.offer,
        body.stage ?? existing.stage,
        Number(body.value_inr ?? body.valueInr ?? existing.value_inr),
        Number(body.recurring ?? existing.recurring),
        body.next_action ?? body.next ?? existing.next_action,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      db.prepare("DELETE FROM offer_pipeline WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/signals") {
      return json(res, 200, {
        sources: all("SELECT * FROM signal_sources ORDER BY sort_order, name"),
        signals: all("SELECT * FROM signals WHERE status != 'dismissed' ORDER BY coalesce(published_at, fetched_at) DESC LIMIT 300"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/signals/refresh") {
      const sources = all("SELECT * FROM signal_sources WHERE active = 1 ORDER BY sort_order");
      const insert = db.prepare(`
        INSERT INTO signals (id, source_id, source_name, category, kind, title, url, summary, thumbnail, published_at, status, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET fetched_at = datetime('now')
      `);
      let inserted = 0;
      const errors = [];
      await Promise.all(
        sources.map(async (source) => {
          try {
            const items = await fetchFeed(source);
            for (const item of items.slice(0, 40)) {
              const before = db.prepare("SELECT 1 FROM signals WHERE id = ?").get(item.id);
              insert.run(
                item.id,
                source.id,
                source.name,
                source.category,
                source.kind,
                item.title,
                item.url,
                item.summary,
                item.thumbnail,
                item.published_at,
              );
              if (!before) inserted += 1;
            }
          } catch (error) {
            errors.push({ source: source.id, error: String(error.message ?? error) });
          }
        }),
      );
      // remove the placeholder seed once real signals exist
      db.prepare("DELETE FROM signals WHERE id = 'seed-1' AND (SELECT count(*) FROM signals WHERE id != 'seed-1') > 0").run();
      return json(res, 200, { ok: true, sources: sources.length, inserted, errors });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/signals/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signals/", ""));
      const existing = db.prepare("SELECT * FROM signals WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "signal_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE signals SET status = ? WHERE id = ?").run(body.status ?? existing.status, id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/signal-sources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO signal_sources (id, name, url, category, kind, active, sort_order)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        id,
        String(body.name ?? "").trim() || "Untitled source",
        String(body.url ?? "").trim(),
        body.category ?? "AI News Hubs",
        body.kind ?? "rss",
        Number(body.sort_order ?? body.sortOrder ?? 99),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/signal-sources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signal-sources/", ""));
      db.prepare("DELETE FROM signal_sources WHERE id = ?").run(id);
      db.prepare("DELETE FROM signals WHERE source_id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/action-queue") {
      return json(res, 200, {
        actions: all("SELECT * FROM action_queue ORDER BY status, sort_order, created_at"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/action-queue") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled action",
        body.summary ?? "",
        body.source ?? "manual",
        body.project_id ?? body.projectId ?? "",
        body.project_path ?? body.projectPath ?? "",
        body.agent ?? "claude",
        body.prompt ?? "",
        body.status ?? "suggested",
        body.impact ?? "normal",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/deploy")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/deploy", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      mkdirSync(queueDir, { recursive: true });
      const stamp = new Date().toISOString();
      const filename = `${id}.md`;
      const filePath = resolve(queueDir, filename);
      const contents = [
        `# Horizon deploy: ${action.title}`,
        "",
        `- id: ${id}`,
        `- agent: ${action.agent}`,
        `- project: ${action.project_id}`,
        `- project_path: ${action.project_path}`,
        `- source: ${action.source}`,
        `- deployed_at: ${stamp}`,
        "",
        "## Summary",
        action.summary || "(none)",
        "",
        "## Prompt",
        "",
        "```",
        action.prompt || "(empty)",
        "```",
        "",
        `Run this in ${action.project_path || "the target project"} with \`${action.agent}\`.`,
        "",
      ].join("\n");
      writeFileSync(filePath, contents, "utf8");
      db.prepare("UPDATE action_queue SET status = 'deployed', deployed_path = ?, updated_at = datetime('now') WHERE id = ?").run(filePath, id);
      db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
        randomUUID(),
        "horizon",
        "action_deploy",
        action.project_id || action.id,
        JSON.stringify({ id, agent: action.agent, path: filePath }),
      );
      return json(res, 200, { ok: true, id, path: filePath });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      const existing = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "action_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE action_queue SET title = ?, summary = ?, project_id = ?, project_path = ?, agent = ?,
          prompt = ?, status = ?, impact = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.summary ?? existing.summary,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.project_path ?? body.projectPath ?? existing.project_path,
        body.agent ?? existing.agent,
        body.prompt ?? existing.prompt,
        body.status ?? existing.status,
        body.impact ?? existing.impact,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      db.prepare("DELETE FROM action_queue WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/inbox") {
      return json(res, 200, {
        resources: all("SELECT * FROM resources ORDER BY sort_order, created_at DESC"),
        posts: all("SELECT * FROM social_posts ORDER BY sort_order, created_at DESC"),
        skills: all("SELECT * FROM social_skills ORDER BY sort_order"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/resources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO resources (id, title, source, kind, project_id, status, note, next_action, tags_json, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled resource",
        body.source ?? "",
        body.kind ?? "link",
        body.project_id ?? body.projectId ?? "",
        body.status ?? "inbox",
        body.note ?? "",
        body.next_action ?? body.next ?? "",
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "resource_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE resources SET title = ?, source = ?, kind = ?, project_id = ?, status = ?,
          note = ?, next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.source ?? existing.source,
        body.kind ?? existing.kind,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.status ?? existing.status,
        body.note ?? existing.note,
        body.next_action ?? body.next ?? existing.next_action,
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? existing.tags_json,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      db.prepare("DELETE FROM resources WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/social-posts") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO social_posts (id, platform, format, hook, body, status, skill_id, project_id, scheduled_for, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.platform ?? "linkedin",
        body.format ?? "post",
        body.hook ?? "",
        body.body ?? "",
        body.status ?? "idea",
        body.skill_id ?? body.skillId ?? "",
        body.project_id ?? body.projectId ?? "",
        body.scheduled_for ?? null,
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      const existing = db.prepare("SELECT * FROM social_posts WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "post_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE social_posts SET platform = ?, format = ?, hook = ?, body = ?, status = ?,
          skill_id = ?, project_id = ?, scheduled_for = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.platform ?? existing.platform,
        body.format ?? existing.format,
        body.hook ?? existing.hook,
        body.body ?? existing.body,
        body.status ?? existing.status,
        body.skill_id ?? body.skillId ?? existing.skill_id,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.scheduled_for ?? existing.scheduled_for,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      db.prepare("DELETE FROM social_posts WHERE id = ?").run(id);
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
