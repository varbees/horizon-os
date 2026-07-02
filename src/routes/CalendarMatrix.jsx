import { useEffect, useMemo, useState } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewList,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  createViewWeekAgenda,
} from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createEventRecurrencePlugin, createEventsServicePlugin } from "@schedule-x/event-recurrence";
import { createScrollControllerPlugin } from "@schedule-x/scroll-controller";
import "@schedule-x/theme-default/dist/index.css";
import "../styles/schedule-x-horizon.css";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  Gem,
  Link2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import {
  agentCalendarPrompts,
  calendarConnectors,
  calendarIcs,
  openSourceSignal,
  strategicCourse,
  timeBlocks,
} from "../data/horizon.js";
import {
  createCalendarEvent,
  createCommandTask,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
} from "../lib/commandBase.js";
import {
  HORIZON_TIMEZONE,
  HORIZON_WEEK_START,
  buildTimeBlockCalendarEvents,
  calendarOptions,
  defaultCalendarDraft,
  draftFromEvent,
  draftToScheduleEvent,
  formatSelectedRange,
  horizonCalendars,
  rowToScheduleEvent,
  scheduleEventToApi,
} from "../lib/calendarEvents.js";
import { useHorizonStore } from "../store/horizonStore.js";

const quickDates = [
  { label: "Fri", date: "2026-05-22", detail: "Today" },
  { label: "Mon", date: "2026-05-25", detail: "Foundry start" },
  { label: "Sat", date: "2026-05-30", detail: "Spec" },
  { label: "Sun", date: "2026-05-31", detail: "Review" },
];

const recurrenceOptions = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Weekly" },
];

function compareEvents(a, b) {
  return a.start.toString().localeCompare(b.start.toString()) || String(a.title).localeCompare(String(b.title));
}

export default function CalendarMatrix() {
  const { completedBlocks, toggleBlock } = useHorizonStore();
  const [calendarEvents, setCalendarEvents] = useState(() => buildTimeBlockCalendarEvents());
  const [selectedEventId, setSelectedEventId] = useState("income-engine");
  const [promptId, setPromptId] = useState("protect-week");
  const [draftPrompt, setDraftPrompt] = useState("Codex, audit this block against the foundry objective.");
  const [eventDraft, setEventDraft] = useState(defaultCalendarDraft);
  const [panelMode, setPanelMode] = useState("details");
  const [activeView, setActiveView] = useState("week");
  const [visibleRange, setVisibleRange] = useState(null);
  const [syncStatus, setSyncStatus] = useState("local seed loaded");
  const [syncError, setSyncError] = useState("");

  const [eventsService] = useState(() => createEventsServicePlugin());
  const [recurrencePlugin] = useState(() => createEventRecurrencePlugin());
  const [calendarControls] = useState(() => createCalendarControlsPlugin());
  const [currentTime] = useState(() => createCurrentTimePlugin({ fullWeekWidth: true }));
  const [eventModal] = useState(() => createEventModalPlugin());
  const [scrollController] = useState(() => createScrollControllerPlugin({ initialScroll: "06:15" }));

  const views = useMemo(
    () => [createViewWeek(), createViewDay(), createViewMonthGrid(), createViewMonthAgenda(), createViewWeekAgenda(), createViewList()],
    [],
  );

  const viewButtons = useMemo(
    () => [
      { label: "Week", view: views[0].name },
      { label: "Day", view: views[1].name },
      { label: "Month", view: views[2].name },
      { label: "Agenda", view: views[3].name },
      { label: "List", view: views[5].name },
    ],
    [views],
  );

  const selectedEvent = useMemo(
    () => calendarEvents.find((event) => String(event.id) === String(selectedEventId)) ?? calendarEvents[0],
    [calendarEvents, selectedEventId],
  );
  const selectedPrompt = agentCalendarPrompts.find((prompt) => prompt.id === promptId) ?? agentCalendarPrompts[0];
  const completed = timeBlocks.filter((block) => completedBlocks[block.id]).length;
  const upcomingEvents = useMemo(() => calendarEvents.slice().sort(compareEvents).slice(0, 10), [calendarEvents]);

  const selectEvent = (event) => {
    if (!event) return;
    setSelectedEventId(String(event.id));
    setEventDraft(draftFromEvent(event));
    setPanelMode("details");
  };

  const config = useMemo(
    () => ({
      views,
      events: calendarEvents,
      calendars: horizonCalendars,
      selectedDate: Temporal.PlainDate.from(HORIZON_WEEK_START),
      defaultView: views[0].name,
      timezone: HORIZON_TIMEZONE,
      firstDayOfWeek: 1,
      showWeekNumbers: true,
      dayBoundaries: {
        start: "06:00",
        end: "22:00",
      },
      weekOptions: {
        gridHeight: 1280,
        nDays: 7,
        eventWidth: 96,
        eventOverlap: false,
        gridStep: 15,
        timeAxisFormatOptions: { hour: "2-digit", minute: "2-digit" },
      },
      monthGridOptions: {
        nEventsPerDay: 5,
      },
      callbacks: {
        onRangeUpdate(range) {
          setVisibleRange(range);
        },
        onEventClick(calendarEvent) {
          selectEvent(calendarEvent);
        },
        onDoubleClickEvent(calendarEvent) {
          selectEvent(calendarEvent);
          setPanelMode("edit");
        },
        onClickDate(date) {
          setEventDraft((current) => ({ ...current, date: date.toString() }));
          setPanelMode("create");
        },
        onClickDateTime(dateTime) {
          setEventDraft((current) => ({
            ...current,
            date: `${dateTime.year}-${String(dateTime.month).padStart(2, "0")}-${String(dateTime.day).padStart(2, "0")}`,
            startTime: `${String(dateTime.hour).padStart(2, "0")}:${String(dateTime.minute).padStart(2, "0")}`,
          }));
          setPanelMode("create");
        },
        onSelectedDateUpdate(date) {
          setSyncStatus(`selected ${date.toString()}`);
        },
      },
    }),
    [calendarEvents, views],
  );

  const plugins = useMemo(
    () => [recurrencePlugin, eventsService, eventModal, currentTime, calendarControls, scrollController],
    [calendarControls, currentTime, eventModal, eventsService, recurrencePlugin, scrollController],
  );

  const calendarApp = useCalendarApp(config, plugins);

  useEffect(() => {
    let cancelled = false;
    fetchCalendarEvents()
      .then(({ events }) => {
        if (cancelled || !events?.length) return;
        const parsedEvents = events.map(rowToScheduleEvent);
        setCalendarEvents(parsedEvents);
        setSelectedEventId((current) => (parsedEvents.some((event) => String(event.id) === String(current)) ? current : String(parsedEvents[0].id)));
        setSyncStatus(`loaded ${parsedEvents.length} local events from SQLite`);
        setSyncError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setSyncError(error.message);
        setSyncStatus("SQLite API offline; using in-browser seed events");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!calendarApp) return;
    try {
      eventsService.set(calendarEvents);
    } catch (error) {
      setSyncError(error.message);
    }
  }, [calendarApp, calendarEvents, eventsService]);

  useEffect(() => {
    if (selectedEvent) setEventDraft(draftFromEvent(selectedEvent));
  }, [selectedEvent]);

  const downloadCalendar = () => {
    window.open("/api/calendar/export.ics", "_blank");
  };

  const setCalendarView = (view) => {
    setActiveView(view);
    try {
      calendarControls.setView(view);
    } catch {
      // Calendar controls initialize after the first render; local state keeps the UI responsive.
    }
  };

  const jumpToDate = (date) => {
    try {
      calendarControls.setDate(Temporal.PlainDate.from(date));
    } catch {
      setSyncStatus(`date queued ${date}`);
    }
  };

  const saveCreatedEvent = async () => {
    const event = draftToScheduleEvent(eventDraft);
    setCalendarEvents((current) => [...current.filter((item) => String(item.id) !== String(event.id)), event]);
    setSelectedEventId(String(event.id));
    setPanelMode("details");
    try {
      await createCalendarEvent(scheduleEventToApi(event));
      setSyncStatus("event saved to SQLite");
      setSyncError("");
    } catch (error) {
      setSyncError(error.message);
      setSyncStatus("event saved locally only");
    }
  };

  const saveEditedEvent = async () => {
    if (!selectedEvent) return;
    const event = draftToScheduleEvent(eventDraft, selectedEvent.id);
    setCalendarEvents((current) => current.map((item) => (String(item.id) === String(event.id) ? event : item)));
    setPanelMode("details");
    try {
      await updateCalendarEvent(event.id, scheduleEventToApi(event));
      setSyncStatus("event update persisted");
      setSyncError("");
    } catch (error) {
      setSyncError(error.message);
      setSyncStatus("event update local only");
    }
  };

  const removeSelectedEvent = async () => {
    if (!selectedEvent) return;
    const id = String(selectedEvent.id);
    const nextEvents = calendarEvents.filter((event) => String(event.id) !== id);
    setCalendarEvents(nextEvents);
    setSelectedEventId(String(nextEvents[0]?.id ?? ""));
    setPanelMode("details");
    try {
      await deleteCalendarEvent(id);
      setSyncStatus("event removed from SQLite");
      setSyncError("");
    } catch (error) {
      setSyncError(error.message);
      setSyncStatus("event removed locally only");
    }
  };

  const createTaskFromSelected = async () => {
    if (!selectedEvent) return;
    try {
      await createCommandTask({
        event_id: selectedEvent.id,
        title: `Output proof: ${selectedEvent.title}`,
        priority: selectedEvent.calendarId === "capital" ? "high" : "normal",
        revenue_impact: selectedEvent.calendarId === "capital" || selectedEvent.calendarId === "product" ? 1 : 0,
      });
      setSyncStatus("task created from selected block");
      setSyncError("");
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const customComponents = useMemo(
    () => ({
      eventModal: ({ calendarEvent }) => (
        <HorizonEventModal
          event={calendarEvent}
          completed={Boolean(completedBlocks[calendarEvent.id])}
          onDone={() => toggleBlock(calendarEvent.id)}
          onEdit={() => {
            selectEvent(calendarEvent);
            setPanelMode("edit");
          }}
        />
      ),
    }),
    [completedBlocks, toggleBlock],
  );

  return (
    <div className="calendar-command-page">
      <div className="mb-4 flex flex-col gap-3 rounded-[var(--hz-radius-lg)] border border-outlineVariant/80 bg-surface/86 px-4 py-3 shadow-rule backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brass">Calendar command surface</p>
          <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-paper lg:text-3xl">
              Foundry calendar surface
            </h1>
            <span className="rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">
              Schedule-X / SQLite / agent bridge
            </span>
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-paper/60">
            Week, day, month, agenda, recurrence, current time, modal details, controls, and local persistence without compressing the workspace.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <PrimaryButton onClick={() => setPanelMode("create")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New block
          </PrimaryButton>
          <button
            type="button"
            onClick={downloadCalendar}
            className="inline-flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-4 py-2.5 text-sm font-bold text-paper/76 transition hover:border-outline hover:text-paper"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export ICS
          </button>
          <a
            href="/api/calendar/export.ics"
            className="inline-flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-4 py-2.5 text-sm font-bold text-paper/76 transition hover:border-outline hover:text-paper"
          >
            Export API
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <section className="calendar-matrix-grid">
        <aside className="calendar-rail space-y-4">
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primaryContainer text-onPrimaryContainer">
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brass">Calendar state</p>
                <h2 className="text-base font-black text-paper">Asia/Kolkata</h2>
              </div>
            </div>
            <p className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3 text-sm font-bold leading-6 text-paper/64">
              {formatSelectedRange(visibleRange)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {quickDates.map((date) => (
                <button
                  key={date.date}
                  type="button"
                  onClick={() => jumpToDate(date.date)}
                  className="rounded-md border border-outlineVariant bg-surfaceVariant p-3 text-left transition hover:border-primary/40 hover:bg-primaryContainer/50"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">{date.label}</span>
                  <span className="mt-1 block text-sm font-black text-paper">{date.detail}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {viewButtons.map((view) => (
                <button
                  key={view.view}
                  type="button"
                  onClick={() => setCalendarView(view.view)}
                  className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                    activeView === view.view
                      ? "border-primary bg-primaryContainer text-onPrimaryContainer"
                      : "border-outlineVariant bg-surface text-paper/58 hover:text-paper"
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Today output</p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              {completed}/{timeBlocks.length}
            </h2>
            <p className="mt-2 text-sm leading-6 text-paper/62">Done only counts when there is an artifact, sent message, updated doc, or logged metric.</p>
            <div className="mt-4 grid gap-2">
              {timeBlocks.slice(0, 5).map((block) => {
                const done = Boolean(completedBlocks[block.id]);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => toggleBlock(block.id)}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${
                      done ? "border-signal/50 bg-signal/12" : "border-outlineVariant bg-surfaceVariant hover:border-outline"
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
                <div key={connector.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-paper">{connector.provider}</p>
                    <span className="rounded-full border border-outlineVariant px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/52">
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

        <Panel className="calendar-main-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-outlineVariant p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Live calendar</p>
              <h2 className="mt-1 text-2xl font-black text-paper">Foundry Calendar Grid</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-2 rounded-full border border-outlineVariant bg-surface px-3 py-2 text-paper/58">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {syncStatus}
              </span>
              {syncError && <span className="rounded-full border border-coral/30 bg-coral/10 px-3 py-2 text-coral">{syncError}</span>}
            </div>
          </div>
          <div className="horizon-schedule">
            <ScheduleXCalendar calendarApp={calendarApp} customComponents={customComponents} />
          </div>
        </Panel>

        <aside className="calendar-inspector space-y-4">
          {panelMode === "create" || panelMode === "edit" ? (
            <CalendarEditor
              mode={panelMode}
              draft={eventDraft}
              onChange={setEventDraft}
              onCancel={() => setPanelMode("details")}
              onCreate={saveCreatedEvent}
              onUpdate={saveEditedEvent}
              onDelete={removeSelectedEvent}
              canDelete={Boolean(selectedEvent)}
            />
          ) : (
            <SelectedEventPanel
              event={selectedEvent}
              completed={Boolean(completedBlocks[selectedEvent?.id])}
              onDone={() => selectedEvent && toggleBlock(selectedEvent.id)}
              onEdit={() => setPanelMode("edit")}
              onTask={createTaskFromSelected}
            />
          )}

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
                    setDraftPrompt(prompt.prompt);
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-xs font-bold transition ${
                    promptId === prompt.id
                      ? "border-signal bg-signal/12 text-paper"
                      : "border-outlineVariant bg-surfaceVariant text-paper/58 hover:text-paper"
                  }`}
                >
                  {prompt.title}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Prompt draft</span>
              <textarea
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                className="mt-2 min-h-28 w-full resize-none rounded-md border border-outlineVariant bg-surfaceContainer p-3 text-sm leading-6 text-paper/78"
              />
            </label>

            <div className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
              <p className="flex items-center gap-2 text-xs font-black text-signal">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                Simulated agent response
              </p>
              <p className="mt-2 text-sm leading-6 text-paper/62">{selectedPrompt.response}</p>
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Upcoming base blocks</p>
            <div className="mt-4 space-y-2">
              {upcomingEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEvent(event)}
                  className={`w-full rounded-md border p-3 text-left transition hover:border-primary/40 ${
                    String(selectedEvent?.id) === String(event.id) ? "border-primary bg-primaryContainer/60" : "border-outlineVariant bg-surfaceVariant"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-black text-paper">{event.title}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: horizonCalendars[event.calendarId]?.lightColors?.main }} />
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/44">
                    {event.calendarId} / {event.start.toString().slice(11, 16)}
                  </p>
                </button>
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
              text: "ICS now. Google OAuth and event sync next. Microsoft Graph after the local event contract is stable.",
            },
            {
              icon: Link2,
              title: "Provider identity",
              text: "Each block now carries local id, calendar id, recurrence rule, sync state, and output contract.",
            },
            {
              icon: ShieldCheck,
              title: "Agent safety",
              text: "Agent chat can propose edits and tasks. Calendar writes stay explicit through this local command surface.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <Icon className="h-5 w-5 text-signal" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-black text-paper">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/56">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="mt-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Chosen course</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {strategicCourse.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-paper">{item.title}</p>
                    <span className="font-mono text-[10px] font-black text-brass">{item.rank}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-signal">{item.stance}</p>
                  <p className="mt-2 text-xs leading-5 text-paper/54">{item.calendarRule}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-outlineVariant bg-primaryContainer/50 p-4">
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
            <div className="mt-4 flex items-end justify-between rounded-md border border-outlineVariant bg-surface p-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Star target</p>
                <p className="mt-1 text-2xl font-black text-paper">{openSourceSignal.targetStars.toLocaleString()}</p>
              </div>
              <Star className="h-6 w-6 fill-brass text-brass" aria-hidden="true" />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SelectedEventPanel({ event, completed, onDone, onEdit, onTask }) {
  if (!event) {
    return (
      <Panel className="p-5">
        <p className="text-sm font-bold text-paper/64">Select a calendar event to inspect it.</p>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Selected block</p>
      <div className="mt-4 flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: horizonCalendars[event.calendarId]?.lightColors?.main }} />
        <div>
          <h2 className="text-xl font-black text-paper">{event.title}</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-paper/42">
            {event.calendarId} / {event.start.toString().slice(0, 16)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-paper/62">{event.description}</p>
      <div className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Output contract</p>
        <p className="mt-2 text-sm font-bold leading-6 text-paper/76">{event.output || "Define one visible output before the block starts."}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDone}
          className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition ${
            completed ? "border-signal/50 bg-signal/14 text-signal" : "border-outlineVariant bg-surface text-paper/68 hover:border-outline"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {completed ? "Done" : "Mark done"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-black text-paper/68 transition hover:border-outline"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Edit
        </button>
      </div>
      <button
        type="button"
        onClick={onTask}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-black text-onPrimary transition hover:brightness-105"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Create task from block
      </button>
    </Panel>
  );
}

function CalendarEditor({ mode, draft, onChange, onCancel, onCreate, onUpdate, onDelete, canDelete }) {
  const update = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <Panel className="p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">{mode === "create" ? "Create block" : "Edit block"}</p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-black text-paper/58">Title</span>
          <input
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-black text-paper/58">Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
              className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-paper/58">Calendar</span>
            <select
              value={draft.calendarId}
              onChange={(event) => {
                const option = calendarOptions.find((item) => item.id === event.target.value);
                onChange({ ...draft, calendarId: event.target.value, lane: option?.label ?? draft.lane });
              }}
              className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
            >
              {calendarOptions.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-black text-paper/58">Start</span>
            <input
              type="time"
              value={draft.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-paper/58">End</span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(event) => update("endTime", event.target.value)}
              className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-black text-paper/58">Repeat</span>
          <select
            value={draft.recurrence}
            onChange={(event) => update("recurrence", event.target.value)}
            className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
          >
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-black text-paper/58">Location</span>
          <input
            value={draft.location}
            onChange={(event) => update("location", event.target.value)}
            className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black text-paper/58">Description</span>
          <textarea
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            className="mt-1 min-h-20 w-full resize-none rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm leading-6 text-paper"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black text-paper/58">Output contract</span>
          <textarea
            value={draft.output}
            onChange={(event) => update("output", event.target.value)}
            className="mt-1 min-h-20 w-full resize-none rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm leading-6 text-paper"
          />
        </label>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-outlineVariant px-3 py-2 text-sm font-black text-paper/60">
          Cancel
        </button>
        <button
          type="button"
          onClick={mode === "create" ? onCreate : onUpdate}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-black text-onPrimary"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {mode === "create" ? "Create" : "Save"}
        </button>
      </div>
      {mode === "edit" && canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm font-black text-coral"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete block
        </button>
      )}
    </Panel>
  );
}

function HorizonEventModal({ event, completed, onDone, onEdit }) {
  return (
    <div className="horizon-event-modal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">{event.calendarId}</p>
          <h2 className="mt-1 text-xl font-black text-paper">{event.title}</h2>
        </div>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: horizonCalendars[event.calendarId]?.lightColors?.main }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-paper/64">{event.description}</p>
      <div className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Output</p>
        <p className="mt-1 text-sm font-bold leading-6 text-paper/74">{event.output || "Define output before this block starts."}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDone}
          className={`rounded-md border px-3 py-2 text-xs font-black ${
            completed ? "border-signal/50 bg-signal/14 text-signal" : "border-outlineVariant bg-surface text-paper/62"
          }`}
        >
          {completed ? "Marked done" : "Mark done"}
        </button>
        <button type="button" onClick={onEdit} className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-black text-paper/62">
          Edit block
        </button>
      </div>
    </div>
  );
}
