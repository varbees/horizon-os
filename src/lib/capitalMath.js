// Pure capital/runway math. Used with both live API rows and static seeds so
// the Capital screen renders identically whether or not the local API is up.

const STAGE_WEIGHT = { prospect: 0.1, conversation: 0.3, proposal: 0.6, won: 1, lost: 0 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function monthsBetween(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const days = (to.getTime() - from.getTime()) / MS_PER_DAY;
  return days / 30.4375;
}

function startOfIsoWeek(reference) {
  const d = new Date(reference);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function computeCapitalMath({ targets = [], ledger = [], pipeline = [], runway = {} }, now = new Date()) {
  const totalTarget = targets.reduce((sum, t) => sum + num(t.target_inr ?? t.targetInr), 0);
  const totalSaved = targets.reduce((sum, t) => sum + num(t.saved_inr ?? t.savedInr), 0);
  const gap = Math.max(totalTarget - totalSaved, 0);

  const cash = num(runway.current_cash_inr ?? runway.currentCashInr);
  const burn = num(runway.monthly_burn_inr ?? runway.monthlyBurnInr);
  const mrr = num(runway.mrr_inr ?? runway.mrrInr);
  const milestoneDate = runway.milestone_date ?? runway.milestoneDate ?? "2027-02-15";

  const netBurn = burn - mrr;
  const runwayMonths = burn > 0 ? cash / burn : null;
  let runwayMonthsNet;
  if (burn <= 0) runwayMonthsNet = null; // burn unknown — cannot compute runway
  else if (netBurn <= 0) runwayMonthsNet = Infinity; // income/MRR covers burn
  else runwayMonthsNet = cash / netBurn;

  const monthsRemaining = Math.max(monthsBetween(now, milestoneDate), 0);
  const requiredMonthly = monthsRemaining > 0 ? gap / monthsRemaining : gap;
  const requiredWeekly = requiredMonthly / 4.345;

  const openStages = new Set(["prospect", "conversation", "proposal"]);
  const pipelineOpen = pipeline
    .filter((p) => openStages.has(p.stage))
    .reduce((sum, p) => sum + num(p.value_inr ?? p.valueInr), 0);
  const pipelineWeighted = pipeline.reduce(
    (sum, p) => sum + num(p.value_inr ?? p.valueInr) * (STAGE_WEIGHT[p.stage] ?? 0),
    0,
  );
  const recurringWon = pipeline
    .filter((p) => p.stage === "won" && num(p.recurring) > 0)
    .reduce((sum, p) => sum + num(p.value_inr ?? p.valueInr), 0);

  const weekStart = startOfIsoWeek(now);
  const inWeek = (row) => new Date(row.date) >= weekStart;
  const weekIn = ledger.filter((r) => inWeek(r) && r.direction === "in").reduce((s, r) => s + num(r.amount_inr ?? r.amountInr), 0);
  const weekOut = ledger.filter((r) => inWeek(r) && r.direction === "out").reduce((s, r) => s + num(r.amount_inr ?? r.amountInr), 0);
  const totalIn = ledger.filter((r) => r.direction === "in").reduce((s, r) => s + num(r.amount_inr ?? r.amountInr), 0);
  const totalOut = ledger.filter((r) => r.direction === "out").reduce((s, r) => s + num(r.amount_inr ?? r.amountInr), 0);

  return {
    totalTarget,
    totalSaved,
    gap,
    progressPct: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
    cash,
    burn,
    mrr,
    netBurn,
    runwayMonths,
    runwayMonthsNet,
    milestoneDate,
    monthsRemaining,
    requiredMonthly,
    requiredWeekly,
    pipelineOpen,
    pipelineWeighted,
    recurringWon,
    weekIn,
    weekOut,
    weekNet: weekIn - weekOut,
    totalIn,
    totalOut,
    needsBurn: burn === 0,
    needsRealNumbers: cash === 0 && burn === 0,
  };
}
