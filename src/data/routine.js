// AI Job Plan daily clock — mirrors _cofounder/AI-JOB-PLAN-2026.md (v1, Part 3).
// The plan started 2026-06-29; phase 1 = Days 1-15, phase 2 = Days 16-30, then sustain.
// All times are IST (Asia/Kolkata) — this machine runs in IST.

export const JOB_PLAN_START = "2026-06-29";

export function jobPlanDayNumber(now = new Date()) {
  const start = new Date(`${JOB_PLAN_START}T00:00:00+05:30`);
  const diff = Math.floor((now - start) / 86_400_000);
  return diff + 1;
}

export function jobPlanPhase(dayNumber) {
  if (dayNumber <= 15) return { id: "sprint", label: "Days 1-15 · Learn + Build" };
  if (dayNumber <= 30) return { id: "apply", label: "Days 16-30 · Apply + Build" };
  return { id: "sustain", label: "Day 30+ · Month 2 arc" };
}

// kind: practice | learn | build | apply | rest | review | revenue
const sprintBlocks = [
  { id: "wake", start: "07:00", end: "08:00", title: "Wake + review yesterday's notes", kind: "review", detail: "No phone-first doomscroll. Yesterday's one-line learnings, today's plan.", deployable: false },
  { id: "unassisted", start: "08:00", end: "08:45", title: "Unassisted practice — no agent, no autocomplete", kind: "practice", detail: "The one non-negotiable. Hand-write the day's concept, then audit AI output for bugs. This builds the judgment the market pays for.", deployable: true },
  { id: "deep-learning", start: "08:45", end: "12:00", title: "Deep learning block", kind: "learn", detail: "The day's curriculum: video/reading + code-along. No distractions.", deployable: true },
  { id: "lunch", start: "12:00", end: "13:00", title: "Lunch", kind: "rest", detail: "Away from the screen.", deployable: false },
  { id: "build", start: "13:00", end: "17:00", title: "Build block — implement, push to GitHub", kind: "build", detail: "Implement what the morning taught. Every day ends with a commit.", deployable: true },
  { id: "break", start: "17:00", end: "18:00", title: "Break / exercise — protected", kind: "rest", detail: "Not optional either. The instrument matters.", deployable: false },
  { id: "light", start: "18:00", end: "20:00", title: "Light block: reading, docs, interview prep", kind: "learn", detail: "2x/week (Wed + Sat) this hosts the ~1hr revenue touchpoint: answer inbound, send warm consulting messages.", deployable: true },
  { id: "review", start: "20:00", end: "21:00", title: "Review + plan tomorrow", kind: "review", detail: "One line on what you actually understood — not just watched.", deployable: false },
];

const applyBlocks = [
  { id: "wake", start: "07:00", end: "08:00", title: "Wake + review", kind: "review", detail: "Same shape as the sprint. Keep the rhythm.", deployable: false },
  { id: "unassisted", start: "08:00", end: "08:45", title: "Unassisted practice — keep it exactly as-is", kind: "practice", detail: "Do not drop this after Day 15. It's the differentiator.", deployable: true },
  { id: "applications", start: "08:45", end: "12:00", title: "Applications — 5-10 tailored per day", kind: "apply", detail: "LinkedIn primary, Naukri, Wellfound. FDE lane = direct outreach, not mass-apply.", deployable: true },
  { id: "lunch", start: "12:00", end: "13:00", title: "Lunch", kind: "rest", detail: "Away from the screen.", deployable: false },
  { id: "build2", start: "13:00", end: "16:00", title: "Continued learning / build", kind: "build", detail: "One more portfolio piece; framework breadth (LlamaIndex, CrewAI, Graph RAG).", deployable: true },
  { id: "revenue-slot", start: "16:00", end: "17:00", title: "1x/week: PhotoSelect / consulting slot", kind: "revenue", detail: "Once a week this replaces applications — one demo booked, one consulting conversation moved forward.", deployable: true },
  { id: "break", start: "17:00", end: "18:00", title: "Break / exercise — protected", kind: "rest", detail: "Still not optional.", deployable: false },
  { id: "interview-prep", start: "18:00", end: "20:00", title: "Interview prep + mocks", kind: "apply", detail: "2x/week AI-interviewer mocks; Days 22-28 add 2-3 full mocks. Post-interview 5-min debrief, same day.", deployable: true },
  { id: "review", start: "20:00", end: "21:00", title: "Review + plan tomorrow", kind: "review", detail: "Close the loop.", deployable: false },
];

export function routineBlocksFor(dayNumber) {
  return jobPlanPhase(dayNumber).id === "sprint" ? sprintBlocks : applyBlocks;
}

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function currentBlockId(blocks, now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
  const nowMin = minutesOf(fmt.format(now));
  const hit = blocks.find((block) => nowMin >= minutesOf(block.start) && nowMin < minutesOf(block.end));
  return hit?.id ?? null;
}

export const routineKindColor = {
  practice: "#ba4d35",
  learn: "#2558d8",
  build: "#087861",
  apply: "#9a6500",
  rest: "#77a0d8",
  review: "#3f7f5f",
  revenue: "#1fbf8f",
};
