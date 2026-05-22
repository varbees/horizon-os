import { ArrowRight, FileText } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { documents } from "../data/horizon.js";

export default function Documents() {
  return (
    <div>
      <SectionHeader
        eyebrow="Docs to build here"
        title="Documents, presentations, and connectors."
        copy="These are the artifacts that keep this from living only in chat. Each document has an owner, a cadence, and the next physical action."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {documents.map((doc) => (
          <Panel key={doc.id} className="flex min-h-[18rem] flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">{doc.type}</p>
                <h2 className="mt-2 text-xl font-black text-paper">{doc.title}</h2>
              </div>
              <FileText className="h-6 w-6 text-paper/38" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm leading-6 text-paper/62">{doc.purpose}</p>
            <div className="mt-auto border-t border-white/10 pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/42">{doc.cadence}</p>
              <p className="mt-2 text-sm font-bold text-paper/78">Owner: {doc.owner}</p>
              <p className="mt-3 flex gap-2 text-sm leading-6 text-paper/62">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                {doc.next}
              </p>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Component output standard</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {["<COMPONENT_NAME>", "Description", "Code", "Suggestions"].map((item) => (
            <div key={item} className="rounded-md border border-white/10 bg-black/18 p-4">
              <p className="font-mono text-sm font-black text-paper">{item}</p>
              <p className="mt-2 text-sm leading-6 text-paper/56">
                {item === "<COMPONENT_NAME>"
                  ? "Single clear module name."
                  : item === "Description"
                    ? "UX rationale, state, interaction behavior."
                    : item === "Code"
                      ? "Working JSX with hooks and accessible controls."
                      : "Next extension, test, export, or connector."}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
