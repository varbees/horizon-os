import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const checklist = [
  "Confirm exact business name and one-line offer.",
  "Collect phone or WhatsApp CTA, service area, and operating hours.",
  "Add 3-5 services with plain-language outcomes.",
  "Add review/trust section with real customer words when available.",
  "Add local business schema, title, description, and social preview.",
  "Run mobile screenshot review before deployment.",
  "Deploy to hskg.vercel.app and keep it as a portfolio proof link.",
];

const sections = [
  {
    title: "Hero",
    copy: "Specific business name, direct offer, service area, one primary contact CTA.",
  },
  {
    title: "Services",
    copy: "Three to five service cards. No vague words. Each card says what the customer gets.",
  },
  {
    title: "Trust",
    copy: "Reviews, years in service, location, photos, and a short note from the business.",
  },
  {
    title: "Contact",
    copy: "WhatsApp, phone, map link, opening hours, and a short inquiry form if needed.",
  },
];

export default function HskgLaunch() {
  return (
    <div>
      <SectionHeader
        eyebrow="Free landing page deployment"
        title="hskg.vercel.app becomes the first public sprint."
        copy="Keep it small and real: one page, one CTA, clean mobile behavior, deployment proof. It is a useful page for Babai and a credible artifact for your outbound."
        action={
          <a
            href="https://hskg.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-extrabold text-onPrimary transition hover:-translate-y-0.5 hover:bg-white"
          >
            Open domain
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-signal" aria-hidden="true" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Launch rule</p>
              <h2 className="text-2xl font-black text-paper">Review before deploy</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-paper/62">
            Build the first version in one afternoon. The page earns complexity only after it has correct copy, contact flow, and mobile screenshots.
          </p>
          <ul className="mt-5 space-y-3">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-paper/64">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-outlineVariant bg-primaryContainer p-5 text-onPrimaryContainer">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-onPrimaryContainer/70">Landing page wireframe</p>
            <h2 className="mt-2 font-display text-4xl font-bold">HSKG</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-onPrimaryContainer/72">
              Replace this copy with the exact business category once details are confirmed. The design should feel trustworthy, local, and direct.
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-md border border-outlineVariant bg-surfaceContainer p-4">
                <h3 className="text-lg font-black text-paper">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/58">{section.copy}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
