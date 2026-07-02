import { useEffect, useMemo, useState } from "react";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import {
  createViewDay,
  createViewList,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
} from "@schedule-x/calendar";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createEventRecurrencePlugin, createEventsServicePlugin } from "@schedule-x/event-recurrence";
import { createScrollControllerPlugin } from "@schedule-x/scroll-controller";
import "@schedule-x/theme-default/dist/index.css";
import "../styles/schedule-x-horizon.css";
import { CheckCircle2, Download, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import {
  createCalendarEvent,
  createCommandTask,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
} from "../lib/commandBase.js";
import {
  HORIZON_TIMEZONE,
  buildRoutineCalendarEvents,
  calendarOptions,
  defaultCalendarDraftToday,
  draftFromEvent,
  draftToScheduleEvent,
  horizonCalendars,
  rowToScheduleEvent,
  scheduleEventToApi,
  todayInHorizonTz,
} from "../lib/calendarEvents.js";
import { JOB_PLAN_PHASE2_START, JOB_PLAN_START, jobPlanDayNumber, jobPlanPhase } from "../data/routine.js";
import { useHorizonStore } from "../store/horizonStore.js";

const recurrenceOptions = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Weekly" },
];

export default function CalendarMatrix() {
  const { completedBlocks, toggleBlock } = useHorizonStore();
  const [calendarEvents, setCalendarEvents] = useState(() => buildRoutineCalendarEvents());
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventDraft, setEventDraft] = useState(defaultCalendarDraftToday);
  const [panelMode, setPanelMode] = useState("details");
  const [activeView, setActiveView] = useState("week");
  const [syncStatus, setSyncStatus] = useState("loading");
  const [syncError, setSyncError] = useState("");

  const [eventsService] = useState(() => createEventsServicePlugin());
  const [recurrencePlugin] = useState(() => createEventRecurrencePlugin());
  const [calendarControls] = useState(() => createCalendarControlsPlugin());
  const [currentTime] = useState(() => createCurrentTimePlugin({ fullWeekWidth: true }));
  const [eventModal] = useState(() => createEventModalPlugin());
  const [scrollController] = useState(() => createScrollControllerPlugin({ initialScroll: "06:45" }));

  const dayNumber = jobPlanDayNumber();
  const phase = jobPlanPhase(dayNumber);

  const views = useMemo(
    () => [createViewWeek(), createViewDay(), createViewMonthGrid(), createViewMonthAgenda(), createViewList()],
    [],
  );

  const viewButtons = useMemo(
    () => [
      { label: "Week", view: views[0].name },
      { label: "Day", view: views[1].name },
      { label: "Month", view: views[2].name },
      { label: "Agenda", view: views[3].name },
      { label: "List", view: views[4].name },
    ],
    [views],
  );

  const quickJumps = useMemo(
    () => [
      { label: "Today", date: todayInHorizonTz(), detail: `Day ${dayNumber}` },
      { label: "Plan start", date: JOB_PLAN_START, detail: "Day 1" },
      { label: "Phase 2", date: JOB_PLAN_PHASE2_START, detail: "Day 16 · apply" },
    ],
    [dayNumber],
  );

  const selectedEvent = useMemo(
    () => calendarEvents.find((event) => String(event.id) === String(selectedEventId)) ?? null,
    [calendarEvents, selectedEventId],
  );

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
      selectedDate: Temporal.PlainDate.from(todayInHorizonTz()),
      defaultView: views[0].name,
      timezone: HORIZON_TIMEZONE,
      firstDayOfWeek: 1,
      showWeekNumbers: true,
      dayBoundaries: { start: "06:00", end: "22:00" },
      weekOptions: {
        gridHeight: 1120,
        nDays: 7,
        eventWidth: 96,
        eventOverlap: false,
        gridStep: 15,
        timeAxisFormatOptions: { hour: "2-digit", minute: "2-digit" },
      },
      monthGridOptions: { nEventsPerDay: 5 },
      callbacks: {
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
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setSyncStatus(`${parsedEvents.length} events from SQLite`);
        setSyncError("");
      })
      .catch((error) => {
        if (cancelled) return;
        setSyncError(error.message);
        setSyncStatus("API offline · seed view");
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

  const setCalendarView = (view) => {
    setActiveView(view);
    try {
      calendarControls.setView(view);
    } catch {
      // Controls initialize after first render; local state keeps the buttons responsive.
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
    setCalendarEvents((current) => current.filter((event) => String(event.id) !== id));
    setSelectedEventId("");
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
        node_id: String(selectedEvent.id).startsWith("jobplan-") ? "job-engine" : null,
        title: `Output proof: ${selectedEvent.title}`,
        priority: selectedEvent.calendarId === "capital" || selectedEvent.calendarId === "body" ? "high" : "normal",
        revenue_impact: selectedEvent.calendarId === "capital" || selectedEvent.calendarId === "attention" ? 1 : 0,
      });
      setSyncStatus("task created from block");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completedBlocks, toggleBlock],
  );

  return (
    <div className="flex min-h-[540px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brass">Calendar · job plan rhythm</p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-paper">Your week, as planned.</h1>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Day {dayNumber} · {phase.label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
              syncError ? "text-rust" : "text-paper/52"
            }`}
          >
            {syncStatus}
          </span>
          <div className="flex overflow-hidden rounded-md border border-outlineVariant">
            {viewButtons.map((view) => (
              <button
                key={view.view}
                type="button"
                onClick={() => setCalendarView(view.view)}
                className={`px-3 py-2 text-xs font-black transition ${
                  activeView === view.view ? "bg-primaryContainer text-onPrimaryContainer" : "bg-surface text-paper/56 hover:text-paper"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
          {quickJumps.map((jump) => (
            <button
              key={jump.label}
              type="button"
              onClick={() => jumpToDate(jump.date)}
              title={jump.detail}
              className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-black text-paper/62 transition hover:border-outline hover:text-paper"
            >
              {jump.label}
            </button>
          ))}
          <PrimaryButton onClick={() => setPanelMode("create")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New block
          </PrimaryButton>
          <a
            href="/api/calendar/export.ics"
            className="inline-flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-black text-paper/68 transition hover:border-outline hover:text-paper"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ICS
          </a>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_336px]">
        <Panel className="overflow-hidden">
          <div className="horizon-schedule h-[calc(100vh-12.5rem)] min-h-[480px] overflow-y-auto">
            <ScheduleXCalendar calendarApp={calendarApp} customComponents={customComponents} />
          </div>
        </Panel>

        <aside className="min-h-0 space-y-3 overflow-y-auto">
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
        </aside>
      </div>
    </div>
  );
}

function SelectedEventPanel({ event, completed, onDone, onEdit, onTask }) {
  if (!event) {
    return (
      <Panel className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Selected block</p>
        <p className="mt-3 text-sm leading-6 text-paper/56">
          Click a block to inspect it. Double-click to edit. Click an empty slot to create a new block there.
        </p>
        <p className="mt-3 text-xs leading-5 text-paper/44">
          The recurring blocks are your job-plan daily clock — the same rhythm the Map routine rail tracks live. Import the ICS into Google
          Calendar to carry it on your phone.
        </p>
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
