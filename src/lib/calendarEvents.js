import "temporal-polyfill/global";
import { hackathonEvents, timeBlocks } from "../data/horizon.js";

export const HORIZON_TIMEZONE = "Asia/Kolkata";
export const HORIZON_WEEK_START = "2026-05-25";

export const horizonCalendars = {
  attention: {
    colorName: "attention",
    label: "Attention",
    lightColors: {
      main: "#9a6500",
      container: "#ffe2a8",
      onContainer: "#2f1d00",
    },
  },
  body: {
    colorName: "body",
    label: "Body",
    lightColors: {
      main: "#ba4d35",
      container: "#ffdad2",
      onContainer: "#410002",
    },
  },
  capital: {
    colorName: "capital",
    label: "Capital",
    lightColors: {
      main: "#087861",
      container: "#cdf4e6",
      onContainer: "#002116",
    },
  },
  product: {
    colorName: "product",
    label: "Product",
    lightColors: {
      main: "#2558d8",
      container: "#dce4ff",
      onContainer: "#081b60",
    },
  },
  systems: {
    colorName: "systems",
    label: "Systems",
    lightColors: {
      main: "#5c6f93",
      container: "#d9e5ff",
      onContainer: "#071d45",
    },
  },
  spec: {
    colorName: "spec",
    label: "Spec",
    lightColors: {
      main: "#6b7f34",
      container: "#e5efbc",
      onContainer: "#1f2600",
    },
  },
  review: {
    colorName: "review",
    label: "Review",
    lightColors: {
      main: "#6f5d00",
      container: "#ffe575",
      onContainer: "#221b00",
    },
  },
  hackathon: {
    colorName: "hackathon",
    label: "Hackathon",
    lightColors: {
      main: "#ba4d35",
      container: "#ffdad2",
      onContainer: "#410002",
    },
  },
  manual: {
    colorName: "manual",
    label: "Manual",
    lightColors: {
      main: "#2558d8",
      container: "#dce4ff",
      onContainer: "#081b60",
    },
  },
};

export const calendarOptions = Object.entries(horizonCalendars).map(([id, calendar]) => ({
  id,
  label: calendar.label,
  color: calendar.lightColors.main,
}));

export const defaultCalendarDraft = {
  title: "New command block",
  date: HORIZON_WEEK_START,
  startTime: "09:00",
  endTime: "09:30",
  calendarId: "manual",
  lane: "Manual",
  location: "Horizon OS",
  description: "Visible output required before this block counts.",
  output: "One shipped artifact, sent message, updated doc, or logged metric.",
  recurrence: "none",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function calendarIdForLane(lane) {
  const normalized = String(lane ?? "manual").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return horizonCalendars[normalized] ? normalized : "manual";
}

function parseTimeRange(timeLabel) {
  const match = String(timeLabel).match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  if (!match) return { startTime: "09:00", endTime: "10:00" };
  return {
    startTime: `${match[1]}:${match[2]}`,
    endTime: `${match[3]}:${match[4]}`,
  };
}

function anchorDateForBlock(block) {
  if (block.calendar.includes("BYDAY=SA") || block.time.startsWith("Sat")) return "2026-05-30";
  if (block.calendar.includes("BYDAY=SU") || block.days === "Sunday") return "2026-05-31";
  return HORIZON_WEEK_START;
}

function zonedFrom(date, time) {
  return Temporal.ZonedDateTime.from(`${date}T${time}:00+05:30[${HORIZON_TIMEZONE}]`);
}

function normalizeRrule(rule) {
  return String(rule ?? "").replace(/^RRULE:/, "");
}

function boundedRrule(rule) {
  const normalized = normalizeRrule(rule);
  if (!normalized || /(?:^|;)COUNT=|(?:^|;)UNTIL=/.test(normalized)) return normalized;
  if (normalized.includes("FREQ=DAILY")) return `${normalized};COUNT=730`;
  if (normalized.includes("BYDAY=MO,TU,WE,TH,FR")) return `${normalized};COUNT=520`;
  return `${normalized};COUNT=104`;
}

function dateStringFromTemporal(value) {
  if (!value) return HORIZON_WEEK_START;
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`;
}

function timeStringFromTemporal(value) {
  if (!value || typeof value.hour !== "number") return "09:00";
  return `${pad(value.hour)}:${pad(value.minute)}`;
}

function serializePeople(people) {
  if (Array.isArray(people)) return JSON.stringify(people);
  if (typeof people === "string") return people;
  return "[]";
}

function parsePeople(peopleJson) {
  try {
    const people = JSON.parse(peopleJson ?? "[]");
    return Array.isArray(people) ? people : [];
  } catch {
    return [];
  }
}

export function buildTimeBlockCalendarEvents() {
  const recurringEvents = timeBlocks.map((block) => {
    const date = anchorDateForBlock(block);
    const { startTime, endTime } = parseTimeRange(block.time);
    const calendarId = calendarIdForLane(block.lane);
    const rrule = boundedRrule(block.calendar);

    return {
      id: block.id,
      title: block.title,
      start: zonedFrom(date, startTime),
      end: zonedFrom(date, endTime),
      calendarId,
      lane: block.lane,
      location: "Horizon OS",
      description: block.activity,
      output: block.output,
      color: block.color,
      source: "seed",
      rrule,
      _customContent: {
        timeGrid: `${block.title}\n${block.lane}`,
        monthGrid: block.title,
        monthAgenda: block.title,
        weekAgenda: `${startTime} ${block.title}`,
      },
    };
  });

  const oneOffEvents = hackathonEvents.map((event) => {
    const { startTime, endTime } = parseTimeRange(event.time);
    const calendarId = calendarIdForLane(event.lane);

    return {
      id: event.id,
      title: event.title,
      start: zonedFrom(event.date, startTime),
      end: zonedFrom(event.date, endTime),
      calendarId,
      lane: event.lane,
      location: "Virtual / Horizon OS",
      description: event.activity,
      output: event.output,
      color: event.color,
      source: "seed",
      rrule: "",
      _customContent: {
        timeGrid: `${event.title}\n${event.lane}`,
        monthGrid: event.title,
        monthAgenda: event.title,
        weekAgenda: `${startTime} ${event.title}`,
      },
    };
  });

  return [...recurringEvents, ...oneOffEvents];
}

export function rowToScheduleEvent(row) {
  const fallback = timeBlocks.find((block) => block.id === row.id);
  const fallbackDate = fallback ? anchorDateForBlock(fallback) : HORIZON_WEEK_START;
  const fallbackTime = parseTimeRange(row.time_label ?? fallback?.time);
  const start = row.start_at ? Temporal.ZonedDateTime.from(row.start_at) : zonedFrom(fallbackDate, fallbackTime.startTime);
  const end = row.end_at ? Temporal.ZonedDateTime.from(row.end_at) : zonedFrom(fallbackDate, fallbackTime.endTime);
  const rrule = boundedRrule(row.rrule || row.recurrence_rule || fallback?.calendar || "");
  const calendarId = row.calendar_id || calendarIdForLane(row.lane);

  return {
    id: row.id,
    title: row.title,
    start,
    end,
    calendarId,
    lane: row.lane,
    location: row.location || "Horizon OS",
    description: row.description || fallback?.activity || "",
    output: row.output_contract || fallback?.output || "",
    color: row.color || fallback?.color || horizonCalendars[calendarId]?.lightColors?.main || "#2558d8",
    source: row.sync_state || row.provider || "local",
    status: row.status || "confirmed",
    people: parsePeople(row.people_json),
    rrule,
    _customContent: {
      timeGrid: `${row.title}\n${row.lane}`,
      monthGrid: row.title,
      monthAgenda: row.title,
      weekAgenda: row.title,
    },
  };
}

export function scheduleEventToApi(event) {
  const startDate = dateStringFromTemporal(event.start);
  const startTime = timeStringFromTemporal(event.start);
  const endTime = timeStringFromTemporal(event.end);

  return {
    id: String(event.id),
    title: event.title ?? "Untitled block",
    lane: event.lane ?? horizonCalendars[event.calendarId]?.label ?? "Manual",
    time_label: `${startDate} ${startTime} - ${endTime}`,
    start_at: event.start?.toString?.() ?? null,
    end_at: event.end?.toString?.() ?? null,
    all_day: event.start instanceof Temporal.PlainDate ? 1 : 0,
    calendar_id: event.calendarId ?? "manual",
    description: event.description ?? "",
    location: event.location ?? "",
    people_json: serializePeople(event.people),
    rrule: event.rrule ?? "",
    recurrence_rule: event.rrule ? `RRULE:${event.rrule}` : "",
    output_contract: event.output ?? "",
    color: event.color ?? horizonCalendars[event.calendarId]?.lightColors?.main ?? "#2558d8",
    status: event.status ?? "confirmed",
    provider: "local",
    sync_state: event.source ?? "local",
  };
}

export function draftFromEvent(event) {
  if (!event) return defaultCalendarDraft;
  const calendarId = event.calendarId ?? "manual";
  return {
    title: event.title ?? "Untitled block",
    date: dateStringFromTemporal(event.start),
    startTime: timeStringFromTemporal(event.start),
    endTime: timeStringFromTemporal(event.end),
    calendarId,
    lane: event.lane ?? horizonCalendars[calendarId]?.label ?? "Manual",
    location: event.location ?? "Horizon OS",
    description: event.description ?? "",
    output: event.output ?? "",
    recurrence: recurrenceFromRrule(event.rrule),
  };
}

export function draftToScheduleEvent(draft, id) {
  const calendarId = draft.calendarId || "manual";
  const rrule = rruleFromRecurrence(draft.recurrence, draft.date);
  return {
    id: id ?? crypto.randomUUID?.() ?? `event-${Date.now()}`,
    title: draft.title.trim() || "Untitled block",
    start: zonedFrom(draft.date, draft.startTime),
    end: zonedFrom(draft.date, draft.endTime),
    calendarId,
    lane: draft.lane || horizonCalendars[calendarId]?.label || "Manual",
    location: draft.location,
    description: draft.description,
    output: draft.output,
    color: horizonCalendars[calendarId]?.lightColors?.main ?? "#2558d8",
    source: "local",
    status: "confirmed",
    rrule,
    _customContent: {
      timeGrid: `${draft.title}\n${draft.lane}`,
      monthGrid: draft.title,
      monthAgenda: draft.title,
      weekAgenda: draft.title,
    },
  };
}

export function recurrenceFromRrule(rrule) {
  const rule = normalizeRrule(rrule);
  if (!rule) return "none";
  if (rule.includes("FREQ=DAILY") && rule.includes("BYDAY=MO,TU,WE,TH,FR")) return "weekdays";
  if (rule.includes("FREQ=DAILY")) return "daily";
  if (rule.includes("FREQ=WEEKLY")) return "weekly";
  return "custom";
}

export function rruleFromRecurrence(recurrence) {
  if (recurrence === "daily") return "FREQ=DAILY;COUNT=730";
  if (recurrence === "weekdays") return "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;COUNT=520";
  if (recurrence === "weekly") return "FREQ=WEEKLY;COUNT=104";
  return "";
}

export function formatSelectedRange(range) {
  if (!range?.start || !range?.end) return "Range loading";
  return `${dateStringFromTemporal(range.start)} to ${dateStringFromTemporal(range.end)}`;
}
