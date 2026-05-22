export const metrics = {
  cashAccumulated: 12500,
  targetCash: 120000,
  currentMrr: 1200,
  targetMrr: 3000,
  runwayMonthlyBurn: 2500,
  sitStreak: 18,
  outboundThisWeek: 14,
  targetOutboundWeek: 25,
  specProgress: 22,
};

export const anchors = [
  {
    id: "body",
    label: "Body",
    title: "Forge the instrument",
    target: "Daily 20-40 minute yoga, strength, or loaded walking.",
    measure: "7 sessions per week, 2 strength days.",
    tone: "No drama. Show up before the mind negotiates.",
  },
  {
    id: "attention",
    label: "Attention",
    title: "Witness before phone",
    target: "30 minute silent sit before screens.",
    measure: "Streak, phone-free first hour, evening three-line review.",
    tone: "The plan is built from clarity, not panic.",
  },
  {
    id: "capital",
    label: "Capital",
    title: "Floor first, then freedom",
    target: "$5k-$10k contract income in 30 days, then $15k-$25k retainers.",
    measure: "25 outbound messages, 3 buyer conversations, weekly cash math.",
    tone: "Service funds you. Product frees you. Wrong order burns time.",
  },
  {
    id: "spec",
    label: "Spec",
    title: "Turn safe haven into numbers",
    target: "Land, water, power, shelter, food, legal, internet, buffer.",
    measure: "One costed line item per day, one region chosen by month 8.",
    tone: "Reality beats fantasy. The spreadsheet is mercy.",
  },
];

export const timeBlocks = [
  {
    id: "ground",
    days: "Daily",
    time: "06:30 - 07:00",
    title: "Attention / Sit",
    lane: "Attention",
    color: "#c8842a",
    activity: "Silent sit. Ramana-style inquiry: Who is sitting?",
    output: "Before phone, same place every day. This is the backbone, not decoration.",
    calendar: "RRULE:FREQ=DAILY",
  },
  {
    id: "instrument",
    days: "Daily",
    time: "07:00 - 07:45",
    title: "Body / Movement",
    lane: "Body",
    color: "#b74b2d",
    activity: "Yoga, mobility, basic strength, or loaded movement.",
    output: "Minimum 20 minutes. Ideal 45. Build the instrument before the workday.",
    calendar: "RRULE:FREQ=DAILY",
  },
  {
    id: "income-engine",
    days: "Mon-Fri",
    time: "08:30 - 10:00",
    title: "Deep Work 1 / Income Engine",
    lane: "Capital",
    color: "#1fbf8f",
    activity: "Service offer, outbound, buyer calls, or retainer delivery.",
    output: "Floor first. No private product maze before the financial base is calmer.",
    calendar: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  },
  {
    id: "photoselect",
    days: "Mon-Fri",
    time: "10:15 - 11:45",
    title: "Deep Work 2 / PhotoSelect",
    lane: "Product",
    color: "#d9b86c",
    activity: "PhotoSelect code, UX, pilot proof, distribution, or studio onboarding.",
    output: "Flagship product gets protected time every weekday.",
    calendar: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  },
  {
    id: "flex",
    days: "Mon-Fri",
    time: "15:00 - 16:30",
    title: "Flex / Systems / Learning",
    lane: "Systems",
    color: "#77a0d8",
    activity: "Docs, infrastructure, HSKG, connectors, CS reading, or client overflow.",
    output: "This is where systems compound without stealing the main build blocks.",
    calendar: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  },
  {
    id: "spec",
    days: "Weekly",
    time: "Sat 10:00 - 11:30",
    title: "Spec / Offgrid Research",
    lane: "Spec",
    color: "#9fb66d",
    activity: "Land options, infra estimates, legal notes, budget sheets.",
    output: "One real line item or decision per week. Turn the haven into numbers.",
    calendar: "RRULE:FREQ=WEEKLY;BYDAY=SA",
  },
  {
    id: "review",
    days: "Daily",
    time: "21:30 - 21:45",
    title: "Daily Review",
    lane: "Review",
    color: "#f5efe4",
    activity: "Three notebook lines: forged, saw, avoided.",
    output: "Close the loop without screens becoming the night.",
    calendar: "RRULE:FREQ=DAILY",
  },
  {
    id: "weekly-review",
    days: "Sunday",
    time: "17:00 - 17:45",
    title: "Weekly Review & Income Check",
    lane: "Review",
    color: "#f5efe4",
    activity: "Review four anchors, outbound, conversations, cash in/out, runway, and next week's one move.",
    output: "Plan updates happen here. Weekday mood does not rewrite the system.",
    calendar: "RRULE:FREQ=WEEKLY;BYDAY=SU",
  },
];

export const strategicCourse = [
  {
    id: "photoselect-revenue",
    rank: "01",
    stance: "Now",
    title: "PhotoSelect Revenue Mode",
    buyer: "Indian wedding and event studios doing 15-30 events per month.",
    decision: "Package the product as a paid implementation plus subscription before broad new SaaS work.",
    calendarRule: "Protected every weekday in Deep Work 2.",
  },
  {
    id: "studio-ai-ops",
    rank: "02",
    stance: "Next",
    title: "Wedding Studio AI Ops Agent",
    buyer: "The same studios after PhotoSelect proves workflow trust.",
    decision: "Upsell lead capture, follow-ups, payment nudges, and client-selection reminders.",
    calendarRule: "Prototype only inside the Income Engine or PhotoSelect pilot blocks.",
  },
  {
    id: "antharmaya-agents",
    rank: "03",
    stance: "Internal",
    title: "Antharmaya Agents Platform",
    buyer: "Not sold directly yet.",
    decision: "Build shared agent, mini-CRM, conversation, task, and analytics infrastructure only after 2-3 paid implementations repeat.",
    calendarRule: "Systems/Flex block only until customer pressure proves the abstraction.",
  },
  {
    id: "coaching-ai-ops",
    rank: "04",
    stance: "Validate Later",
    title: "Coaching Centre AI Ops",
    buyer: "Tuition and test-prep centres with recurring fee collection.",
    decision: "Strong candidate, but it must wait until the studio wedge creates repeatable infrastructure.",
    calendarRule: "One research spike after the first studio implementation is paid.",
  },
  {
    id: "clinic-journey-agent",
    rank: "05",
    stance: "Validate Later",
    title: "Clinic / Diagnostic Journey Agent",
    buyer: "Small clinics and diagnostic labs.",
    decision: "Potentially valuable, but carries higher trust, privacy, and compliance burden.",
    calendarRule: "No build work before a paid discovery call.",
  },
  {
    id: "ai-ops-observability",
    rank: "06",
    stance: "Infrastructure Later",
    title: "AI Ops Observability",
    buyer: "AI consultancies and SaaS teams shipping agents.",
    decision: "Keep as the RateGuard-style support layer after Antharmaya runs real agent workloads.",
    calendarRule: "Monthly review only until live agent failures create the need.",
  },
];

export const calendarConnectors = [
  {
    id: "ics",
    provider: "ICS Export",
    status: "Live",
    priority: "Now",
    action: "Download or import `public/horizon-calendar.ics`.",
    fit: "No auth, lowest risk, immediate Google/Outlook import.",
    capabilities: ["Recurring Foundry Week", "Portable file", "Manual refresh"],
  },
  {
    id: "google",
    provider: "Google Calendar API",
    status: "Architecture ready",
    priority: "Next",
    action: "OAuth, create/update events, watch `Events` changes through a webhook.",
    fit: "Best first native connector because Google Calendar is the likely personal calendar.",
    capabilities: ["Recurring events", "Push notifications", "Two-way sync"],
  },
  {
    id: "outlook",
    provider: "Microsoft Graph Calendar",
    status: "Compatible path",
    priority: "Later",
    action: "OAuth through Microsoft identity, create events, subscribe to Outlook event changes.",
    fit: "Useful if client work or personal scheduling moves into Microsoft 365.",
    capabilities: ["Recurring events", "Change notifications", "Outlook web links"],
  },
  {
    id: "agent",
    provider: "Codex Agent Bridge",
    status: "Design now",
    priority: "Next",
    action: "Calendar event -> agent prompt -> task/doc/git change, with confirmation before writes.",
    fit: "Turns the calendar from static blocks into the operating surface for daily execution.",
    capabilities: ["Context prompts", "Review scripts", "Commit reminders"],
  },
];

export const agentCalendarPrompts = [
  {
    id: "protect-week",
    title: "Protect this week",
    prompt: "Audit my week against the foundry objective. What should move, shrink, or be refused?",
    response:
      "Protect Income Engine and PhotoSelect first. Move non-revenue research into Flex. Do not activate coaching, clinic, or observability until studio revenue proof exists.",
  },
  {
    id: "selected-block",
    title: "Turn block into next action",
    prompt: "Use the selected calendar block and give me the next physical action.",
    response:
      "Convert the block into one visible artifact: shipped code, sent outbound, updated doc, logged metric, or a calendar decision. No vague progress entry counts.",
  },
  {
    id: "calendar-sync",
    title: "Prepare connector sync",
    prompt: "Generate the Google/Outlook payload plan for these recurring blocks.",
    response:
      "Use ICS now. For native sync, store local event ids, provider event ids, recurrence rules, last sync token, and source-of-truth ownership before enabling writes.",
  },
  {
    id: "sunday-review",
    title: "Sunday review script",
    prompt: "Run the weekly review from this calendar.",
    response:
      "Check: sit streak, movement sessions, outbound count, buyer conversations, PhotoSelect proof, cash in/out, runway, one avoided thing, one next-week move.",
  },
];

export const openSourceSignal = {
  repoName: "agent-calendar-os",
  targetStars: 5000,
  currentStars: 0,
  stance: "Short-goal OSS wedge",
  thesis:
    "Extract the agent-aware calendar, connector contracts, and premium command UI into an open-source developer tool while the private Horizon OS remains personal.",
  whyItCanTravel:
    "Developers understand calendars, agent workflows, MCP-style tool calling, and shadcn-quality blocks. A polished local-first command calendar is easier to star than a private vertical SMB product.",
  milestones: [
    { stars: 100, label: "Usable demo", output: "Public README, screenshots, local ICS import, shadcn-style blocks." },
    { stars: 500, label: "Developer trust", output: "Google connector stub, examples, docs site, install command." },
    { stars: 1000, label: "Community proof", output: "Plugin API, prompt recipes, weekly release rhythm." },
    { stars: 5000, label: "Category signal", output: "Google/Outlook sync, MCP bridge, template marketplace, contributor guide." },
  ],
  weeklyActions: [
    "Extract one reusable calendar block from Horizon OS.",
    "Publish one screenshot or short demo clip.",
    "Write one sharp README section around the developer pain.",
    "Log stars, issues, forks, and inbound DMs in the Sunday review.",
  ],
};

export const projects = [
  {
    id: "forge",
    name: "Interactive Component Forge",
    now: true,
    horizon: "Day 1-21",
    revenue: "$5k-$10k first engagement, then retainers.",
    fit: "Best immediate build because it converts your UI speed into sales proof.",
    brief:
      "A library of polished SaaS dashboard widgets, SVG explainers, and motion demos. Each outbound lead receives a tiny custom component showing how their app could feel.",
    examples: [
      "PhotoSelect-style album pipeline timeline for a SaaS founder.",
      "RevOps automation canvas for a sales-led startup.",
      "AI assistant audit panel that shows latency, cost, and risk.",
    ],
    deliverables: ["10 demo components", "1 landing page", "25 personalized outbound clips", "pricing one-pager"],
  },
  {
    id: "hskg",
    name: "hskg.vercel.app Launch",
    now: true,
    horizon: "Day 1-7",
    revenue: "Trust artifact, portfolio proof, local SEO asset.",
    fit: "A free, clean, deployable landing page for Babai that doubles as a public build proof.",
    brief:
      "One fast page with clear offer, WhatsApp/contact route, service area, review section, schema markup, and deployment review checklist.",
    examples: ["Hero with real business name", "Services grid", "Before/after or trust section", "Contact CTA"],
    deliverables: ["Copy deck", "One-page build", "SEO metadata", "Deployment checklist"],
  },
  {
    id: "photoselect",
    name: "PhotoSelect Proof Loop",
    now: false,
    horizon: "Day 8-45",
    revenue: "Product proof for Indian studios and outbound credibility.",
    fit: "Your strongest existing proof: operational software for Indian studios.",
    brief:
      "Convert PhotoSelect into a repeatable case study: problem, workflow, selection/payment unlock, before-after screenshots, and pilot outreach.",
    examples: ["Shot Sunday. Delivered Monday. story", "Studio workflow demo", "Pricing capacity story"],
    deliverables: ["Case study page", "Demo script", "Studio lead list", "Pilot cohort doc"],
  },
  {
    id: "spec-engine",
    name: "Offgrid Spec Engine",
    now: false,
    horizon: "Month 2-8",
    revenue: "Not a revenue product yet. It protects the mission from fantasy.",
    fit: "Keeps the safe-haven dream operational by forcing concrete cost and region decisions.",
    brief:
      "A private spreadsheet and dashboard tracking land, water, power, shelter, food, legal, internet, and 12-month buffer.",
    examples: ["Solar + battery quote comparison", "Region shortlist matrix", "Monthly runway burn chart"],
    deliverables: ["Spec sheet", "Cost assumptions", "Region shortlist", "Month 8 decision memo"],
  },
];

export const documents = [
  {
    id: "operating-plan",
    title: "24-Month Horizon Operating Plan",
    type: "Presentation",
    owner: "You + Codex",
    cadence: "Review every Sunday",
    purpose: "One source of truth for body, attention, capital, and spec.",
    next: "Convert the 12-month plan into a 24-month roadmap with phase gates.",
  },
  {
    id: "income-plan",
    title: "Income Pathway Funnel Sheet",
    type: "Spreadsheet",
    owner: "You",
    cadence: "Update daily after outbound",
    purpose: "Contacts, replies, calls, offers, signed retainers, cash collected.",
    next: "Create 50-account target list and log the first 25 personalized messages.",
  },
  {
    id: "calendar",
    title: "Google / Outlook Calendar Connector Spec",
    type: "Connector",
    owner: "Codex",
    cadence: "Import once, then design native sync",
    purpose: "Recurring blocks, provider sync, and agent prompts that remove daily decision fatigue.",
    next: "Use ICS now; build Google OAuth + event sync before Outlook.",
  },
  {
    id: "calendar-agent",
    title: "Agent Calendar Command Surface",
    type: "Product spec",
    owner: "Codex",
    cadence: "Improve every command-center sprint",
    purpose: "Make each calendar block chat-aware, output-aware, and tied to docs/git/tasks.",
    next: "Wire selected event context into real agent actions with confirmation gates.",
  },
  {
    id: "vertical-ai-course",
    title: "Vertical AI Course Map",
    type: "Strategy doc",
    owner: "You + Codex",
    cadence: "Review monthly",
    purpose: "Keep PhotoSelect and wedding studio AI ops as the wedge while later verticals stay gated.",
    next: "Start PhotoSelect Revenue Mode and define the Wedding Studio AI Ops upsell offer.",
  },
  {
    id: "hskg-brief",
    title: "HSKG Landing Page Launch Brief",
    type: "Deployment doc",
    owner: "Codex + You",
    cadence: "Daily until deployed",
    purpose: "Make hskg.vercel.app reviewable, deployable, and useful.",
    next: "Collect business name, service list, phone/WhatsApp, area, and photos.",
  },
  {
    id: "component-forge",
    title: "Interactive Component Forge Offer",
    type: "Sales asset",
    owner: "You",
    cadence: "Iterate after every 10 conversations",
    purpose: "A precise offer for AI-augmented UI/product engineering retainers.",
    next: "Ship 3 example components and attach them to the first outreach batch.",
  },
  {
    id: "safe-haven",
    title: "Offgrid Safe-Haven Spec Sheet",
    type: "Decision memo",
    owner: "You",
    cadence: "One line item per weekday",
    purpose: "Turn land, water, power, shelter, food, legal, and internet into numbers.",
    next: "Choose 2-3 candidate regions and add real price ranges.",
  },
  {
    id: "oss-signal",
    title: "Open Source Star Path",
    type: "OSS launch doc",
    owner: "You + Codex",
    cadence: "One weekly public artifact",
    purpose: "Create a shorter public-goal loop without distracting from revenue.",
    next: "Extract the calendar command surface into an `agent-calendar-os` README and demo plan.",
  },
];

export const phaseGates = [
  {
    label: "Weeks 1-4",
    title: "Lock the floor",
    target: "$5k-$10k contract income, 10 buyer conversations, one public offer.",
  },
  {
    label: "Months 2-5",
    title: "Service engine",
    target: "2-3 retainers, $15k+ monthly, at least one bad-fit client refused.",
  },
  {
    label: "Months 4-8",
    title: "Wedge product",
    target: "Repeatable pain solved 3 times, small SaaS/tool live, $1k-$3k MRR.",
  },
  {
    label: "Months 8-12",
    title: "Transition",
    target: "Service tapers, product MRR holds, land/spec decision becomes real.",
  },
  {
    label: "Year 2",
    title: "Stabilize the haven",
    target: "Reliable remote income, operating routines, land setup, no panic rebuilds.",
  },
];

export const systemNodes = [
  {
    id: "witness",
    label: "Witness",
    kind: "Orientation",
    status: "Always on",
    x: 460,
    y: 64,
    color: "#f5efe4",
    note: "Global orientation. Watch drift before fixing tactics.",
    next: "Refuse any work that does not strengthen revenue, PhotoSelect, the command center, or the safe-haven backbone.",
    outputs: ["Drift detection", "Weekly truth", "Scope cuts"],
  },
  {
    id: "daily-floor",
    label: "Daily Floor",
    kind: "Backbone",
    status: "Non-negotiable",
    x: 148,
    y: 174,
    color: "#b74b2d",
    note: "Sit, movement, and evening review keep the builder stable enough to execute.",
    next: "Keep morning sit and movement before market inputs.",
    outputs: ["Sit streak", "Movement sessions", "Review notes"],
  },
  {
    id: "calendar",
    label: "Calendar OS",
    kind: "Command Surface",
    status: "Live UI",
    x: 460,
    y: 218,
    color: "#77a0d8",
    note: "Repeating blocks, connector sync, selected-event context, and agent prompts.",
    next: "Build Google connector after ICS import is stable.",
    outputs: ["Week grid", "ICS export", "Agent prompts"],
  },
  {
    id: "income-engine",
    label: "Income Engine",
    kind: "Revenue",
    status: "Focus now",
    x: 784,
    y: 174,
    color: "#1fbf8f",
    note: "Productized service, outbound, buyer calls, retainers, and implementation packages.",
    next: "Send 25 targeted messages around PhotoSelect implementation and AI ops.",
    outputs: ["Buyer calls", "Signed service", "Cash floor"],
  },
  {
    id: "photoselect",
    label: "PhotoSelect",
    kind: "Flagship",
    status: "Revenue mode",
    x: 724,
    y: 374,
    color: "#d9b86c",
    note: "Primary long-term product. Monetize with paid studio implementation before widening.",
    next: "Package 30-day implementation offer and pitch 3-5 studios.",
    outputs: ["Pilot studios", "Case study", "Subscription"],
  },
  {
    id: "studio-ai-ops",
    label: "Studio AI Ops",
    kind: "Upsell",
    status: "Next",
    x: 456,
    y: 438,
    color: "#c8842a",
    note: "Wedding studio lead, follow-up, quote, payment, and selection reminder automation.",
    next: "Prototype only after PhotoSelect revenue conversations reveal repeated ops pain.",
    outputs: ["Lead capture", "Payment nudges", "Simple CRM"],
  },
  {
    id: "antharmaya-agents",
    label: "Agents Core",
    kind: "Platform",
    status: "Internal",
    x: 218,
    y: 438,
    color: "#9fb66d",
    note: "Shared agent, reminder, conversation, and analytics substrate built from paid delivery patterns.",
    next: "Extract modules only after 2-3 paid implementations repeat the same workflow.",
    outputs: ["Adapters", "Task engine", "Ops analytics"],
  },
  {
    id: "hskg",
    label: "HSKG",
    kind: "Proof",
    status: "Small win",
    x: 112,
    y: 314,
    color: "#f5efe4",
    note: "Fast public delivery proof and goodwill page.",
    next: "Ship reviewable page, mobile polish, and contact CTA.",
    outputs: ["Landing page", "SEO proof", "Portfolio trust"],
  },
  {
    id: "oss-signal",
    label: "OSS Signal",
    kind: "Public Loop",
    status: "Short goal",
    x: 930,
    y: 314,
    color: "#f0c86a",
    note: "Open-source `agent-calendar-os` extraction for GitHub stars, demos, and developer trust.",
    next: "Publish README, screenshot, and one reusable command-calendar block.",
    outputs: ["Stars", "Issues", "Inbound devs"],
  },
  {
    id: "safe-haven",
    label: "Safe Haven Spec",
    kind: "Life System",
    status: "Weekly",
    x: 460,
    y: 612,
    color: "#c66f4d",
    note: "Land, water, power, shelter, food, legal, internet, and runway numbers.",
    next: "Cost one real line item each week.",
    outputs: ["Region shortlist", "Infra cost", "Decision memo"],
  },
];

export const systemEdges = [
  { from: "witness", to: "daily-floor", label: "stabilizes" },
  { from: "witness", to: "calendar", label: "orients" },
  { from: "witness", to: "income-engine", label: "filters" },
  { from: "daily-floor", to: "calendar", label: "repeats" },
  { from: "calendar", to: "income-engine", label: "protects" },
  { from: "calendar", to: "photoselect", label: "protects" },
  { from: "calendar", to: "hskg", label: "ships" },
  { from: "income-engine", to: "photoselect", label: "sells" },
  { from: "photoselect", to: "studio-ai-ops", label: "upsells" },
  { from: "studio-ai-ops", to: "antharmaya-agents", label: "hardens" },
  { from: "antharmaya-agents", to: "oss-signal", label: "extracts" },
  { from: "calendar", to: "oss-signal", label: "extracts" },
  { from: "income-engine", to: "safe-haven", label: "funds" },
  { from: "daily-floor", to: "safe-haven", label: "keeps" },
];

export const calendarIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Antharmaya//Horizon OS//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Horizon OS Foundry Week
X-WR-TIMEZONE:Asia/Kolkata
BEGIN:VTIMEZONE
TZID:Asia/Kolkata
X-LIC-LOCATION:Asia/Kolkata
BEGIN:STANDARD
TZOFFSETFROM:+0530
TZOFFSETTO:+0530
TZNAME:IST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:horizon-ground-20260525@antharmaya.local
SUMMARY:Attention / Sit
DTSTART;TZID=Asia/Kolkata:20260525T063000
DTEND;TZID=Asia/Kolkata:20260525T070000
RRULE:FREQ=DAILY;UNTIL=20280522T182959Z
DESCRIPTION:30 minute silent sit before phone. Inquiry: Who is sitting?
END:VEVENT
BEGIN:VEVENT
UID:horizon-instrument-20260525@antharmaya.local
SUMMARY:Body / Movement
DTSTART;TZID=Asia/Kolkata:20260525T070000
DTEND;TZID=Asia/Kolkata:20260525T074500
RRULE:FREQ=DAILY;UNTIL=20280522T182959Z
DESCRIPTION:Yoga, mobility, basic strength, or loaded movement. Minimum 20 minutes.
END:VEVENT
BEGIN:VEVENT
UID:horizon-income-20260525@antharmaya.local
SUMMARY:Deep Work 1 / Income Engine
DTSTART;TZID=Asia/Kolkata:20260525T083000
DTEND;TZID=Asia/Kolkata:20260525T100000
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20280522T182959Z
DESCRIPTION:Service offer, outbound, buyer calls, or retainer delivery. Floor first.
END:VEVENT
BEGIN:VEVENT
UID:horizon-photoselect-20260525@antharmaya.local
SUMMARY:Deep Work 2 / PhotoSelect
DTSTART;TZID=Asia/Kolkata:20260525T101500
DTEND;TZID=Asia/Kolkata:20260525T114500
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20280522T182959Z
DESCRIPTION:PhotoSelect code, UX, pilot proof, distribution, or studio onboarding.
END:VEVENT
BEGIN:VEVENT
UID:horizon-flex-20260525@antharmaya.local
SUMMARY:Flex / Systems / Learning
DTSTART;TZID=Asia/Kolkata:20260525T150000
DTEND;TZID=Asia/Kolkata:20260525T163000
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20280522T182959Z
DESCRIPTION:Docs, infrastructure, HSKG, connectors, CS reading, or client overflow.
END:VEVENT
BEGIN:VEVENT
UID:horizon-spec-20260530@antharmaya.local
SUMMARY:Spec / Offgrid Research
DTSTART;TZID=Asia/Kolkata:20260530T100000
DTEND;TZID=Asia/Kolkata:20260530T113000
RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20280522T182959Z
DESCRIPTION:Land options, infra estimates, legal notes, and budget sheets.
END:VEVENT
BEGIN:VEVENT
UID:horizon-review-20260525@antharmaya.local
SUMMARY:Daily Review
DTSTART;TZID=Asia/Kolkata:20260525T213000
DTEND;TZID=Asia/Kolkata:20260525T214500
RRULE:FREQ=DAILY;UNTIL=20280522T182959Z
DESCRIPTION:Three lines: What did I forge? What did I see? What did I avoid?
END:VEVENT
BEGIN:VEVENT
UID:horizon-sunday-review-20260531@antharmaya.local
SUMMARY:Weekly Review & Income Check
DTSTART;TZID=Asia/Kolkata:20260531T170000
DTEND;TZID=Asia/Kolkata:20260531T174500
RRULE:FREQ=WEEKLY;BYDAY=SU;UNTIL=20280522T182959Z
DESCRIPTION:Review anchors, runway, outbound, conversations, one next-week move.
END:VEVENT
BEGIN:VEVENT
UID:horizon-monthly-recalibration-20260531@antharmaya.local
SUMMARY:Monthly Recalibration
DTSTART;TZID=Asia/Kolkata:20260531T170000
DTEND;TZID=Asia/Kolkata:20260531T183000
RRULE:FREQ=MONTHLY;BYDAY=SU;BYSETPOS=-1;UNTIL=20280522T182959Z
DESCRIPTION:Who was I this month? What is the most honest plan? What must be cut?
END:VEVENT
END:VCALENDAR`;
