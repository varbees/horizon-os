const variants = {
  primary: "border-primary bg-primary text-onPrimary hover:bg-primary/90",
  secondary: "border-outlineVariant bg-surfaceVariant text-paper/70 hover:border-primary hover:text-paper",
  quiet: "border-transparent bg-transparent text-paper/60 hover:border-outlineVariant hover:bg-surfaceVariant hover:text-paper",
  danger: "border-rust/30 bg-rust/10 text-rust hover:border-rust/50",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  icon: "h-10 w-10 p-0",
};

export default function Button({
  as: Component = "button",
  children,
  className = "",
  icon: Icon,
  variant = "secondary",
  size = "sm",
  ...props
}) {
  return (
    <Component
      className={[
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md border font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant] ?? variants.secondary,
        sizes[size] ?? sizes.sm,
        className,
      ].join(" ")}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}
