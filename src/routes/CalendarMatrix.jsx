import { useMemo, useState } from "react";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  ExternalLink,
  Gem,
  Link2,
  MessageSquareText,
  ShieldCheck,
  Star,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import {
  agentCalendarPrompts,
  calendarConnectors,
  calendarIcs,
  openSourceSignal,
  strategicCourse,
  timeBlocks,
} from "../data/horizon.js";
import { useHorizonStore } from "../store/horizonStore.js";

const dayColumns = [
  { key: "MO", label: "Mon", date: "25", name: "May 25" },
  { key: "TU", label: "Tue", date: "26", name: "May 26" },
  { key: "WE", label: "Wed", date: "27", name: "May 27" },
  { key: "TH", label: "Thu", date: "28", name: "May 28" },
  { key: "FR", label: "Fri", date: "29", name: "May 29" },
  { key: "SA", label: "Sat", date: "30", name: "May 30" },
  { key: "SU", label: "Sun", date: "31", name: "May 31" },
];

const hours = Array.from({ length: 17 }, (_, index) => index + 6);
const gridStart = 6 * 60;
const hourHeight = 64;

function parseTimeRange(block) {
  const match = block.time.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  if (!match) return { start: 9 * 60, end: 10 * 60 };
  const [, startHour, startMinute, endHour, endMinute] = match;
  return {
    start: Number(startHour) * 60 + Number(startMinute),
    end: Number(endHour) * 60 + Number(endMinute),
  };
}

function dayKeysFor(block) {
  if (block.days === "Daily") return dayColumns.map((day) => day.key);
  if (block.days === "Mon-Fri") return ["MO", "TU", "WE", "TH", "FR"];
  if (block.days === "Sunday") return ["SU"];
  if (block.time.startsWith("Sat")) return ["SA"];
  return ["MO"];
}

function buildEvents() {
  return timeBlocks.flatMap((block) => {
    const { start, end } = parseTimeRange(block);
    return dayKeysFor(block).map((dayKey) => ({
      ...block,
      instanceId: `${block.id}-${dayKey}`,
      dayKey,
      start,
      end,
      startLabel: block.time.match(/(\d{2}:\d{2})/)?.[1] ?? block.time,
      endLabel: block.time.match(/-\s*(\d{2}:\d{2})/)?.[1] ?? "",
    }));
  });
}

function minutesToOffset(minutes) {
  return ((minutes - gridStart) / 60) * hourHeight;
}

function minutesToHeight(start, end) {
  return Math.max(((end - start) / 60) * hourHeight - 6, 28);
}

export default function CalendarMatrix() {
  const { completedBlocks, toggleBlock } = useHorizonStore();
  const [activeView, setActiveView] = useState("week");
  const [selectedDay, setSelectedDay] = useState("MO");
  const [selectedEventId, setSelectedEventId] = useState("income-engine-MO");
  const [promptId, setPromptId] = useState("protect-week");
  const [draft, setDraft] = useState("Codex, audit this block against the foundry objective.");
  const events = useMemo(() => buildEvents(), []);
  const selectedEvent = events.find((event) => event.instanceId === selectedEventId) ?? events[0];
  const selectedPrompt = agentCalendarPrompts.find((prompt) => prompt.id === promptId) ?? agentCalendarPrompts[0];
  const completed = timeBlocks.filter((block) => completedBlocks[block.id]).length;
  const dayEvents = events.filter((event) => event.dayKey === selectedDay).sort((a, b) => a.start - b.start);

  const downloadCalendar = () => {
    const blob = new Blob([calendarIcs], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "horizon-os-calendar.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Calendar command surface"
        title="A Google-class calendar built around the foundry."
        copy="Use the calendar as the repetitive operating surface: time blocks, connector sync, selected-event context, and agent prompts live in one place."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={downloadCalendar}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download ICS
            </PrimaryButton>
            <a
              href="/horizon-calendar.ics"
              className="inline-flex items-center gap-2 rounded-md border border-white/12 px-4 py-2.5 text-sm font-bold text-paper/76 transition hover:border-white/30 hover:text-paper"
            >
              Static file
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <aside className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-paper/58 transition hover:border-white/24 hover:text-paper"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brass">Foundry Week</p>
                <p className="text-sm font-black text-paper">May 25 - 31, 2026</p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-paper/58 transition hover:border-white/24 hover:text-paper"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {dayColumns.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => {
                    setSelectedDay(day.key);
                    setActiveView("day");
                  }}
                  className={`rounded-md px-1 py-2 transition ${
                    selectedDay === day.key
                      ? "bg-signal text-ink"
                      : "border border-white/8 bg-white/[0.035] text-paper/64 hover:text-paper"
                  }`}
                >
                  <span className="block font-mono text-[9px] uppercase">{day.label}</span>
                  <span className="mt-1 block text-sm font-black">{day.date}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Today output</p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              {completed}/{timeBlocks.length}
            </h2>
            <p className="mt-2 text-sm leading-6 text-paper/62">
              Local checks are a friction marker. The Sunday review decides what becomes truth.
            </p>
            <div className="mt-4 grid gap-2">
              {timeBlocks.slice(0, 5).map((block) => {
                const done = Boolean(completedBlocks[block.id]);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => toggleBlock(block.id)}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${
                      done ? "border-signal/50 bg-signal/12" : "border-white/10 bg-black/16 hover:border-white/24"
                    }`}
                    aria-pressed={done}
                  >
                    <span className="min-w-0 truncate text-xs font-bold text-paper/74">{block.title}</span>
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${done ? "text-signal" : "text-paper/24"}`} />
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Connector stack</p>
            <div className="mt-4 space-y-3">
              {calendarConnectors.map((connector) => (
                <div key={connector.id} className="rounded-md border border-white/10 bg-black/16 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-paper">{connector.provider}</p>
                    <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/52">
                      {connector.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-signal">{connector.status}</p>
                  <p className="mt-2 text-xs leading-5 text-paper/54">{connector.fit}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Live calendar</p>
              <h2 className="mt-1 text-2xl font-black text-paper">Foundry Week Command Grid</h2>
            </div>
            <div className="grid grid-cols-4 rounded-lg border border-white/10 bg-black/18 p-1 text-xs font-bold">
              {["week", "day", "month", "agenda"].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`rounded-md px-3 py-2 capitalize transition ${
                    activeView === view ? "bg-paper text-ink" : "text-paper/58 hover:text-paper"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {activeView === "week" && (
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                <div className="grid grid-cols-[4rem_repeat(7,minmax(7.5rem,1fr))] border-b border-white/10">
                  <div className="border-r border-white/10 p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/36">
                    IST
                  </div>
                  {dayColumns.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDay(day.key)}
                      className={`border-r border-white/10 p-3 text-left transition last:border-r-0 ${
                        selectedDay === day.key ? "bg-white/[0.06]" : "hover:bg-white/[0.035]"
                      }`}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/44">{day.label}</span>
                      <span className="ml-2 text-lg font-black text-paper">{day.date}</span>
                    </button>
                  ))}
                </div>

                <div
                  className="grid grid-cols-[4rem_repeat(7,minmax(7.5rem,1fr))]"
                  style={{ minHeight: `${(hours.length - 1) * hourHeight}px` }}
                >
                  <div className="border-r border-white/10">
                    {hours.slice(0, -1).map((hour) => (
                      <div key={hour} className="h-16 border-b border-white/8 px-2 py-1 text-right font-mono text-[10px] text-paper/32">
                        {hour}:00
                      </div>
                    ))}
                  </div>

                  {dayColumns.map((day) => (
                    <div key={day.key} className="relative border-r border-white/10 last:border-r-0">
                      {hours.slice(0, -1).map((hour) => (
                        <div key={hour} className="h-16 border-b border-white/8" />
                      ))}
                      {events
                        .filter((event) => event.dayKey === day.key)
                        .map((event) => (
                          <button
                            key={event.instanceId}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(event.instanceId);
                              setSelectedDay(event.dayKey);
                            }}
                            className={`absolute left-1 right-1 overflow-hidden rounded-md border p-2 text-left shadow-rule transition hover:scale-[1.01] ${
                              selectedEventId === event.instanceId
                                ? "border-signal bg-signal/18"
                                : "border-white/12 bg-ink/92 hover:border-white/28"
                            }`}
                            style={{
                              top: `${minutesToOffset(event.start)}px`,
                              height: `${minutesToHeight(event.start, event.end)}px`,
                            }}
                          >
                            <span className="block font-mono text-[10px] text-paper/46">
                              {event.startLabel} - {event.endLabel}
                            </span>
                            <span className="mt-1 block truncate text-xs font-black text-paper">{event.title}</span>
                            <span className="mt-1 block truncate text-[11px] font-bold text-paper/50">{event.lane}</span>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === "day" && (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/42">
                    {dayColumns.find((day) => day.key === selectedDay)?.name}
                  </p>
                  <h3 className="text-xl font-black text-paper">Single-day operating lane</h3>
                </div>
                <CalendarClock className="h-6 w-6 text-paper/38" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                {dayEvents.map((event) => (
                  <CalendarListEvent
                    key={event.instanceId}
                    event={event}
                    selected={selectedEventId === event.instanceId}
                    onSelect={() => setSelectedEventId(event.instanceId)}
                    completed={Boolean(completedBlocks[event.id])}
                    onToggle={() => toggleBlock(event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeView === "month" && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {dayColumns.map((day) => (
                  <div key={day.key} className="rounded-md border border-white/10 bg-black/16 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">{day.label}</p>
                    <p className="mt-1 text-2xl font-black text-paper">{day.date}</p>
                    <div className="mt-3 space-y-1">
                      {events
                        .filter((event) => event.dayKey === day.key)
                        .slice(0, 4)
                        .map((event) => (
                          <button
                            key={event.instanceId}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(event.instanceId);
                              setSelectedDay(event.dayKey);
                              setActiveView("day");
                            }}
                            className="block w-full truncate rounded-sm px-2 py-1 text-left text-[11px] font-bold text-paper/68 transition hover:bg-white/8 hover:text-paper"
                          >
                            {event.startLabel} {event.title}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "agenda" && (
            <div className="space-y-3 p-4">
              {events
                .slice()
                .sort((a, b) => dayColumns.findIndex((day) => day.key === a.dayKey) - dayColumns.findIndex((day) => day.key === b.dayKey) || a.start - b.start)
                .map((event) => (
                  <CalendarListEvent
                    key={event.instanceId}
                    event={event}
                    selected={selectedEventId === event.instanceId}
                    onSelect={() => {
                      setSelectedEventId(event.instanceId);
                      setSelectedDay(event.dayKey);
                    }}
                    completed={Boolean(completedBlocks[event.id])}
                    onToggle={() => toggleBlock(event.id)}
                  />
                ))}
            </div>
          )}
        </Panel>

        <aside className="space-y-4">
          <Panel className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Selected block</p>
            <div className="mt-4 flex items-start gap-3">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
              <div>
                <h2 className="text-xl font-black text-paper">{selectedEvent.title}</h2>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-paper/42">
                  {selectedEvent.dayKey} / {selectedEvent.startLabel} - {selectedEvent.endLabel}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-paper/62">{selectedEvent.activity}</p>
            <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Output contract</p>
              <p className="mt-2 text-sm font-bold leading-6 text-paper/76">{selectedEvent.output}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleBlock(selectedEvent.id)}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-black transition ${
                completedBlocks[selectedEvent.id]
                  ? "border-signal/50 bg-signal/14 text-signal"
                  : "border-white/12 bg-white/[0.035] text-paper/72 hover:border-white/28 hover:text-paper"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {completedBlocks[selectedEvent.id] ? "Marked done" : "Mark local done"}
            </button>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-signal/30 bg-signal/12 text-signal">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Agent chat</p>
                <h2 className="text-lg font-black text-paper">Calendar-aware Codex bridge</h2>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {agentCalendarPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => {
                    setPromptId(prompt.id);
                    setDraft(prompt.prompt);
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-xs font-bold transition ${
                    promptId === prompt.id
                      ? "border-signal bg-signal/12 text-paper"
                      : "border-white/10 bg-black/16 text-paper/58 hover:text-paper"
                  }`}
                >
                  {prompt.title}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Prompt draft</span>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-2 min-h-28 w-full resize-none rounded-md border border-white/10 bg-black/24 p-3 text-sm leading-6 text-paper/78"
              />
            </label>

            <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
              <p className="flex items-center gap-2 text-xs font-black text-signal">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                Simulated agent response
              </p>
              <p className="mt-2 text-sm leading-6 text-paper/62">{selectedPrompt.response}</p>
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Chosen course</p>
            <div className="mt-4 space-y-3">
              {strategicCourse.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-md border border-white/10 bg-black/16 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-paper">{item.title}</p>
                    <span className="font-mono text-[10px] font-black text-brass">{item.rank}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-signal">{item.stance}</p>
                  <p className="mt-2 text-xs leading-5 text-paper/54">{item.calendarRule}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Open source signal</p>
                <h2 className="mt-2 text-xl font-black text-paper">{openSourceSignal.repoName}</h2>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-md border border-brass/30 bg-brass/12 text-brass">
                <Gem className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-paper/60">{openSourceSignal.thesis}</p>
            <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Star target</p>
                  <p className="mt-1 text-2xl font-black text-paper">{openSourceSignal.targetStars.toLocaleString()}</p>
                </div>
                <Star className="h-6 w-6 fill-brass text-brass" aria-hidden="true" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[2%] rounded-full bg-brass" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {openSourceSignal.milestones.slice(0, 4).map((milestone) => (
                <div key={milestone.stars} className="rounded-md border border-white/10 bg-black/16 p-3">
                  <p className="font-mono text-[10px] font-black text-brass">{milestone.stars.toLocaleString()} stars</p>
                  <p className="mt-1 text-xs font-bold text-paper/68">{milestone.label}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </section>

      <Panel className="mt-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Cloud,
              title: "Native sync path",
              text: "ICS now. Google OAuth and event sync next. Microsoft Graph after the Google contract is stable.",
            },
            {
              icon: Link2,
              title: "Provider identity",
              text: "Every block needs a local id, provider id, recurrence rule, sync token, and source ownership flag.",
            },
            {
              icon: ShieldCheck,
              title: "Agent safety",
              text: "Agent chat can propose calendar, docs, and git actions, but writes should require explicit confirmation.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-md border border-white/10 bg-black/18 p-4">
                <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-black text-paper">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/56">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function CalendarListEvent({ event, selected, completed, onSelect, onToggle }) {
  return (
    <div
      className={`grid gap-3 rounded-lg border p-3 transition sm:grid-cols-[7rem_minmax(0,1fr)_7rem] sm:items-center ${
        selected ? "border-signal bg-signal/12" : "border-white/10 bg-white/[0.035]"
      }`}
    >
      <button type="button" onClick={onSelect} className="text-left">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{event.dayKey}</p>
        <p className="mt-1 text-sm font-black text-paper">
          {event.startLabel} - {event.endLabel}
        </p>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: event.color }} aria-hidden="true" />
          <h3 className="truncate text-base font-extrabold text-paper">{event.title}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper/58">{event.activity}</p>
      </button>
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition ${
          completed ? "border-signal/50 text-signal" : "border-white/10 text-paper/46 hover:text-paper"
        }`}
        aria-pressed={completed}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {completed ? "Done" : event.lane}
      </button>
    </div>
  );
}
