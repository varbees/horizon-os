export default function SectionHeader({ eyebrow, title, copy, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-paper sm:text-5xl">
          {title}
        </h1>
        {copy ? <p className="mt-3 max-w-2xl text-base leading-7 text-paper/62">{copy}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
