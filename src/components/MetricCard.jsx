import { motion } from "framer-motion";

export default function MetricCard({ label, value, helper, progress, accent = "bg-signal", children }) {
  const width = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <section className="glass rounded-lg p-5" aria-label={label}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-paper/48">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-paper sm:text-4xl">{value}</p>
        </div>
        {children}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/10">
        <motion.div
          className={`h-full rounded-full ${accent}`}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-paper/60">{helper}</p>
    </section>
  );
}
