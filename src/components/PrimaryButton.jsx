export default function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-paper px-4 py-2.5 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
