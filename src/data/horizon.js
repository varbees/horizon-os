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
    title: "Google Calendar Connector Spec",
    type: "Connector",
    owner: "Codex",
    cadence: "Import once, adjust weekly",
    purpose: "Recurring blocks that remove daily decision fatigue.",
    next: "Import the generated ICS and keep the first week strict.",
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
  { id: "witness", label: "Witness", x: 450, y: 72, color: "#f5efe4", note: "Global orientation. Watch drift before fixing tactics." },
  { id: "forge", label: "The Forge", x: 170, y: 220, color: "#b74b2d", note: "Body and attention floor. Built before the market starts shouting." },
  { id: "engine", label: "Income Engine", x: 450, y: 248, color: "#1fbf8f", note: "Outbound, retainers, PhotoSelect proof, component forge." },
  { id: "spec", label: "Safe-Haven Spec", x: 730, y: 220, color: "#c8842a", note: "Land, water, power, shelter, food, legal, internet, buffer." },
  { id: "calendar", label: "Calendar Connector", x: 450, y: 420, color: "#77a0d8", note: "Repeating blocks make the plan run when motivation drops." },
];

export const systemEdges = [
  ["witness", "forge"],
  ["witness", "engine"],
  ["witness", "spec"],
  ["forge", "calendar"],
  ["engine", "calendar"],
  ["spec", "calendar"],
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
