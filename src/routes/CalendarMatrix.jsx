import { CheckCircle2, Download, ExternalLink, RefreshCw } from "lucide-react";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { calendarIcs, timeBlocks } from "../data/horizon.js";
import { useHorizonStore } from "../store/horizonStore.js";

export default function CalendarMatrix() {
  const { completedBlocks, toggleBlock } = useHorizonStore();
  const completed = timeBlocks.filter((block) => completedBlocks[block.id]).length;

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
        eyebrow="Google Calendar connector"
        title="A day that repeats until the plan becomes normal."
        copy="Import the ICS into Google Calendar. Keep the first week strict. Editing the calendar is allowed after Sunday review, not during a weak afternoon."
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

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Today</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{completed}/{timeBlocks.length} blocks checked</h2>
          <p className="mt-3 text-sm leading-6 text-paper/62">
            The checkboxes are local optimistic state. Use them for feel, not as a courtroom record. The Sunday review is where numbers become truth.
          </p>
          <div className="mt-5 rounded-md border border-white/10 bg-black/20 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-signal">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Connector rule
            </p>
            <p className="mt-2 text-sm leading-6 text-paper/58">
              Calendar blocks define time. The app tracks output. Documents capture decisions. Do not merge those jobs.
            </p>
          </div>
        </Panel>

        <div className="grid gap-3">
          {timeBlocks.map((block) => {
            const done = Boolean(completedBlocks[block.id]);
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => toggleBlock(block.id)}
                className={`group grid gap-3 rounded-lg border p-4 text-left transition sm:grid-cols-[9rem_minmax(0,1fr)_8rem] sm:items-center ${
                  done
                    ? "border-signal/55 bg-signal/12"
                    : "border-white/10 bg-white/[0.035] hover:border-white/24 hover:bg-white/[0.06]"
                }`}
                aria-pressed={done}
              >
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{block.days}</p>
                  <p className="mt-1 text-sm font-black text-paper">{block.time}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: block.color }} aria-hidden="true" />
                    <h3 className="text-lg font-extrabold text-paper">{block.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-paper/62">{block.activity}</p>
                  <p className="mt-2 font-mono text-xs leading-5 text-paper/42">{block.output}</p>
                </div>
                <div className="flex items-center justify-start gap-2 sm:justify-end">
                  <CheckCircle2 className={`h-5 w-5 ${done ? "text-signal" : "text-paper/22"}`} aria-hidden="true" />
                  <span className="text-sm font-bold text-paper/58">{block.lane}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
