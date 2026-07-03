import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Parses _cofounder/AI-JOB-PLAN-2026.md into a "today" view (which day of the
// 30-day curriculum are we on, and what is today's focus/build) and persists
// per-day check state to .horizon/job-plan-state.json. Prose stays the source of
// truth; this only reads the Week 1/2 tables + computes the current day.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_PATH = resolve(repoRoot, ".horizon", "job-plan-state.json");
const DEFAULT_START = "2026-06-29"; // Day 1
const TOTAL_DAYS = 30;

function planPath() {
  return resolve(repoRoot, "..", "_cofounder", "AI-JOB-PLAN-2026.md");
}

function clean(s) {
  return String(s || "")
    .replace(/\[\[?\d+\]\]?\(#ref\d+\)/g, "") // footnote refs
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .trim();
}

export function readState() {
  try {
    if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    /* fall through to default */
  }
  return { startDate: DEFAULT_START, days: {} };
}

export function writeState(state) {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
  } catch {
    /* best-effort */
  }
  return state;
}

export function patchDay(day, patch) {
  const state = readState();
  const key = String(day);
  state.days = state.days || {};
  state.days[key] = { ...(state.days[key] || {}), ...patch };
  return writeState(state);
}

export function setStartDate(startDate) {
  const state = readState();
  state.startDate = startDate;
  return writeState(state);
}

function parseDays(md) {
  const days = {};
  const rowRe = /^\|\s*(\d{1,2})\s*\|(.+?)\|(.+?)\|\s*$/gm;
  let m;
  while ((m = rowRe.exec(md)) !== null) {
    const day = Number(m[1]);
    if (day >= 1 && day <= 14) days[day] = { day, focus: clean(m[2]), build: clean(m[3]) };
  }
  // Day 15 + 16–30 are described in prose, not tables.
  days[15] = { day: 15, focus: "Polish and publish", build: "READMEs + architecture diagrams + demo GIFs, 2 blog posts, LinkedIn headline update" };
  for (let d = 16; d <= TOTAL_DAYS; d += 1) {
    days[d] = { day: d, focus: "Apply while continuing to build", build: "3h applications · 3h build · 2h interview prep. Keep the 45-min unassisted block." };
  }
  return days;
}

function extractNonNegotiable(md) {
  const m = /Daily non-negotiable[^\n]*\n([\s\S]*?)\n\n/.exec(md);
  return m ? clean(m[1]).replace(/\n+/g, " ") : "45 minutes of unassisted work before touching any agent.";
}

const CLOCK = [
  { time: "07:00–08:00", label: "Wake, review yesterday's notes" },
  { time: "08:00–08:45", label: "Unassisted practice — no agent, no autocomplete", key: "unassisted" },
  { time: "08:45–12:00", label: "Deep learning block — the day's video/reading + code-along", key: "learn" },
  { time: "13:00–17:00", label: "Build block — implement it, push to GitHub", key: "build" },
  { time: "17:00–18:00", label: "Break / exercise — protected" },
  { time: "18:00–20:00", label: "Light block — reading, docs, interview prep" },
  { time: "20:00–21:00", label: "Review the day, one line on what you understood, plan tomorrow", key: "review" },
];

function daysBetween(a, b) {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.floor(ms / 86400000);
}

export function getJobPlan(today = new Date().toISOString().slice(0, 10)) {
  const path = planPath();
  if (!existsSync(path)) {
    return { available: false, reason: "no_plan", path };
  }
  const md = readFileSync(path, "utf8");
  const state = readState();
  const startDate = state.startDate || DEFAULT_START;
  const dayMap = parseDays(md);
  const raw = daysBetween(startDate, today) + 1;
  const currentDay = Math.max(1, Math.min(TOTAL_DAYS, raw));
  const phase = currentDay <= 7 ? "Week 1 · Foundations" : currentDay <= 14 ? "Week 2 · Advanced systems" : currentDay === 15 ? "Day 15 · Polish & publish" : "Days 16–30 · Apply while building";

  // streak: consecutive completed days ending yesterday
  const isComplete = (d) => {
    const s = state.days?.[String(d)];
    return s && s.unassisted && s.learn && s.build && s.review;
  };
  let streak = 0;
  for (let d = currentDay - 1; d >= 1; d -= 1) {
    if (isComplete(d)) streak += 1; else break;
  }

  return {
    available: true,
    startDate,
    currentDay,
    totalDays: TOTAL_DAYS,
    phase,
    beyond: raw > TOTAL_DAYS ? raw - TOTAL_DAYS : 0,
    today: dayMap[currentDay] || { day: currentDay, focus: "", build: "" },
    nonNegotiable: extractNonNegotiable(md),
    clock: CLOCK,
    streak,
    state: state.days?.[String(currentDay)] || {},
    docPath: path,
  };
}
