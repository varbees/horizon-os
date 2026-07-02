export default function SegmentedControl({ label, options, value, onChange, className = "" }) {
  return (
    <div className={`inline-flex min-w-0 overflow-hidden rounded-md border border-outlineVariant ${className}`} aria-label={label}>
      {options.map((option) => {
        const id = typeof option === "string" ? option : option.id;
        const text = typeof option === "string" ? option : option.label;
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={[
              "px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.14em] transition",
              active ? "bg-primary text-onPrimary" : "bg-surfaceVariant text-paper/52 hover:bg-primary/8 hover:text-paper",
            ].join(" ")}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
